import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildPacket } from "@/lib/genlayer/packet"
import { unwrapWalletKey, decryptPrivateKey } from "@/lib/wallet/unwrap"
import { createClient as createGlClient, createAccount, chains } from "genlayer-js"
import { ExecutionResult, TransactionStatus, type Hash } from "genlayer-js/types"

const FINALIZED_STATUSES = new Set(["finalized", "rechecked"])
const RECEIPT_POLL_INTERVAL_MS = Number(process.env.GENLAYER_RECEIPT_POLL_INTERVAL_MS ?? 5_000)
const RECEIPT_POLL_RETRIES = Number(process.env.GENLAYER_RECEIPT_POLL_RETRIES ?? 180)
const SUCCESSFUL_RESULT_NAMES = new Set(["AGREE", "MAJORITY_AGREE"])
const FAILED_RESULT_NAMES = new Set([
  "DISAGREE",
  "TIMEOUT",
  "DETERMINISTIC_VIOLATION",
  "NO_MAJORITY",
  "MAJORITY_DISAGREE",
])

function isSuccessfulExecution(receipt: Record<string, unknown>) {
  const resultName = String(
    receipt.txExecutionResultName ??
    receipt.tx_execution_result_name ??
    receipt.executionResultName ??
    ""
  )
  const consensusResultName = String(
    receipt.transactionResultName ??
    receipt.txResultName ??
    receipt.resultName ??
    ""
  )
  const consensusResultCode = String(receipt.result ?? "")

  if (resultName === ExecutionResult.FINISHED_WITH_RETURN || resultName === "FINISHED_WITH_RETURN") return true
  if (resultName === "FINISHED_WITH_ERROR") return false
  if (FAILED_RESULT_NAMES.has(consensusResultName)) return false
  return SUCCESSFUL_RESULT_NAMES.has(consensusResultName) || consensusResultCode === "6"
}

function receiptFailureMessage(receipt: Record<string, unknown>) {
  const executionResultName = String(
    receipt.txExecutionResultName ??
    receipt.tx_execution_result_name ??
    receipt.executionResultName ??
    "UNKNOWN"
  )
  const txResult = String(receipt.transactionResultName ?? receipt.txResultName ?? receipt.result ?? "")
  const consensusResultName = String(receipt.resultName ?? "")
  return `GenLayer transaction did not finish successfully. execution=${executionResultName}${txResult ? ` result=${txResult}` : ""}${consensusResultName ? ` resultName=${consensusResultName}` : ""}`
}

export async function POST(request: Request) {
  const admin = createAdminClient()
  let caseId: string | undefined
  let txHash: string | undefined
  let userId: string | undefined

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    userId = user.id

    const body = await request.json()
    caseId = body.caseId
    const publicEvidenceUrls = Array.isArray(body.publicEvidenceUrls) ? body.publicEvidenceUrls : []
    if (!caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 })

    const masterSecret = process.env.WALLET_MASTER_SECRET
    if (!masterSecret) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })

    const { data: caseRow } = await admin
      .from("governance_cases").select("*, datasets(*)").eq("id", caseId).eq("user_id", user.id).single()
    if (!caseRow) return NextResponse.json({ error: "Case not found" }, { status: 404 })

    const profileId = (caseRow as Record<string, string | null>).profile_id
    if (!profileId) {
      return NextResponse.json({ error: "Dataset profile is required before GenLayer submission." }, { status: 400 })
    }

    const { data: profileRow } = await admin
      .from("dataset_profiles")
      .select("raw_sample_hash,schema_snapshot_hash,evidence_manifest_hash,profile_hash")
      .eq("id", profileId)
      .single()

    if (!profileRow?.raw_sample_hash || !profileRow.schema_snapshot_hash || !profileRow.evidence_manifest_hash) {
      return NextResponse.json({ error: "Missing required profile hashes for GenLayer submission." }, { status: 400 })
    }

    const { data: evidenceFiles } = await admin
      .from("evidence_files").select("file_hash,evidence_hash").eq("data_source_id", (caseRow as Record<string, string | null>).data_source_id)

    const packet = buildPacket(
      caseRow as Record<string, string | null>,
      (caseRow as { datasets?: Record<string, string | null> }).datasets ?? {},
      [
        profileRow.evidence_manifest_hash,
        ...((evidenceFiles ?? []) as Array<{ file_hash?: string | null; evidence_hash?: string | null }>)
          .map((e) => e.file_hash ?? e.evidence_hash ?? "")
          .filter(Boolean),
      ],
      publicEvidenceUrls,
      {
        sampleRowsHash: profileRow.raw_sample_hash,
        schemaSnapshotHash: profileRow.schema_snapshot_hash,
        evidenceManifestHash: profileRow.evidence_manifest_hash,
      }
    )

    let privateKey = process.env.GENLAYER_PRIVATE_KEY
    if (!privateKey) {
      const { data: wallet } = await admin.from("wallets").select("*").eq("user_id", user.id).single()
      if (!wallet) return NextResponse.json({ error: "No wallet found" }, { status: 404 })

      const { data: managedWrap } = await admin
        .from("wallet_key_wraps").select("*").eq("wallet_id", wallet.id).eq("method", "managed").single()
      if (!managedWrap) return NextResponse.json({ error: "Wallet wrap not found" }, { status: 500 })

      const wek = unwrapWalletKey(managedWrap.encrypted_wallet_key, managedWrap.salt, user.id, masterSecret)
      privateKey = decryptPrivateKey(wallet.encrypted_private_key, wek)
    }

    const contractAddress = process.env.GENLAYER_CONTRACT_ADDRESS
    if (!contractAddress) return NextResponse.json({ error: "Contract address not configured" }, { status: 503 })

    const glAccount = createAccount(privateKey as `0x${string}`)
    const glClient = createGlClient({
      chain: {
        ...chains.studionet,
        rpcUrls: { default: { http: [process.env.GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api"] } },
      },
      account: glAccount,
    })

    // Full validator consensus: do not pass leaderOnly here.
    txHash = await glClient.writeContract({
      address: contractAddress as `0x${string}`,
      functionName: "submit_case",
      value: BigInt(0),
      args: [
        packet.caseId, packet.datasetName, packet.datasetPurpose, packet.dataDomain,
        packet.downstreamConsumer, packet.businessCriticality, packet.issueType,
        packet.affectedColumns, packet.missingnessSummary, packet.duplicationSummary,
        packet.schemaDriftSummary, packet.freshnessSummary, packet.validitySummary,
        packet.volumeSummary, packet.historicalBaselineSummary, packet.proposedFix,
        packet.rollbackPlan, packet.dataContractSummary, packet.sampleRowsHash,
        packet.schemaSnapshotHash, packet.evidenceHash, packet.evidenceManifestHash,
        packet.publicEvidenceUrls, packet.analystNotes, packet.candidateOutcomeA,
        packet.candidateOutcomeB, packet.candidateOutcomeC,
      ],
    })

    const receipt = await glClient.waitForTransactionReceipt({
      hash: txHash as Hash,
      status: TransactionStatus.FINALIZED,
      interval: RECEIPT_POLL_INTERVAL_MS,
      retries: RECEIPT_POLL_RETRIES,
    }) as Record<string, unknown>

    if (!isSuccessfulExecution(receipt)) {
      await admin.from("contract_activity_logs").insert({
        user_id: user.id,
        governance_case_id: caseId,
        contract_address: contractAddress,
        transaction_hash: txHash,
        action: "submit_case",
        status: "failed",
        error_message: receiptFailureMessage(receipt),
      })
      await admin.from("governance_cases").update({ status: "genlayer_failed" }).eq("id", caseId)
      return NextResponse.json({ error: receiptFailureMessage(receipt), txHash, receipt }, { status: 502 })
    }

    const exists = await glClient.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "has_case",
      args: [caseId],
    }) as boolean
    if (!exists) {
      throw new Error("Consensus receipt finalized, but has_case returned false.")
    }

    const caseStatus = await glClient.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_case_status",
      args: [caseId],
    }) as string
    if (!FINALIZED_STATUSES.has(caseStatus)) {
      throw new Error(`Consensus receipt finalized, but contract status is ${caseStatus}.`)
    }

    const cardJson = await glClient.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_case_summary_card",
      args: [caseId],
    }) as string
    const card = JSON.parse(cardJson) as Record<string, unknown>

    const decisionJson = await glClient.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_latest_decision",
      args: [caseId],
    }) as string
    const decision = JSON.parse(decisionJson) as Record<string, unknown>
    const consensus = (decision.consensus ?? {}) as Record<string, unknown>

    const verdictPayload = {
      user_id: user.id,
      governance_case_id: caseId,
      contract_address: contractAddress,
      transaction_hash: txHash,
      case_id_on_chain: caseId,
      verdict: String(card.verdict ?? consensus.verdict ?? "requires_human_review"),
      dataset_action: String(card.dataset_action ?? consensus.dataset_action ?? ""),
      severity: String(card.severity ?? consensus.severity ?? "medium"),
      confidence_label: String(card.confidence_label ?? consensus.confidence_label ?? "medium"),
      selected_outcome: String(card.governance_class ?? consensus.selected_outcome ?? ""),
      reasoning_summary: String(consensus.reasoning_summary ?? ""),
      evidence_digest: String(card.evidence_hash ?? packet.evidenceHash),
      fix_assessment: String(consensus.fix_assessment ?? ""),
      downstream_risk: String(consensus.downstream_risk ?? ""),
      consensus_status: caseStatus,
      consensus_timestamp: new Date().toISOString(),
    }

    const { data: existingVerdict, error: existingVerdictError } = await admin
      .from("genlayer_governance_verdicts")
      .select("id")
      .eq("governance_case_id", caseId)
      .maybeSingle()
    if (existingVerdictError) throw existingVerdictError

    const verdictWrite = existingVerdict?.id
      ? await admin
        .from("genlayer_governance_verdicts")
        .update(verdictPayload)
        .eq("id", existingVerdict.id)
        .select("id")
        .single()
      : await admin
        .from("genlayer_governance_verdicts")
        .insert(verdictPayload)
        .select("id")
        .single()
    if (verdictWrite.error) throw verdictWrite.error

    await admin.from("contract_activity_logs").insert({
      user_id: user.id,
      governance_case_id: caseId,
      contract_address: contractAddress,
      transaction_hash: txHash,
      action: "submit_case",
      status: "finalized",
    })

    await admin.from("governance_cases").update({
      status: "verdict_received",
      submitted_to_genlayer_at: new Date().toISOString(),
    }).eq("id", caseId)

    // Apply governance verdict to the dataset
    const finalVerdict = String(card.verdict ?? consensus.verdict ?? "")
    const datasetId = (caseRow as Record<string, string | null>).dataset_id
    if (datasetId) {
      const newGovernanceStatus =
        finalVerdict === "quarantine_dataset"         ? "quarantined"
        : finalVerdict === "approved"                 ? "approved"
        : finalVerdict === "approved_with_warning"    ? "approved"
        : null  // other verdicts leave dataset status unchanged

      if (newGovernanceStatus) {
        await admin.from("datasets")
          .update({ governance_status: newGovernanceStatus })
          .eq("id", datasetId)
      }
    }

    return NextResponse.json({ ok: true, txHash, receipt, status: caseStatus, verdict: card })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[genlayer/submit-case]", msg)
    if (caseId) {
      try {
        await admin.from("contract_activity_logs").insert({
          user_id: userId,
          governance_case_id: caseId,
          transaction_hash: txHash,
          action: "submit_case",
          status: "failed",
          error_message: msg,
        })
      } catch {}
      try {
        await admin.from("governance_cases").update({ status: "genlayer_failed" }).eq("id", caseId)
      } catch {}
    }
    return NextResponse.json({ error: msg, txHash }, { status: 500 })
  }
}
