import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createGlClient, chains } from "genlayer-js"

function glClient() {
  return createGlClient({
    chain: {
      ...chains.studionet,
      rpcUrls: { default: { http: [process.env.GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api"] } },
    },
  })
}

export async function POST(request: Request) {
  try {
    const { caseId, txHash } = await request.json()
    if (!caseId || !txHash) return NextResponse.json({ error: "caseId and txHash required" }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const contractAddress = process.env.GENLAYER_CONTRACT_ADDRESS
    if (!contractAddress) return NextResponse.json({ error: "Contract not configured" }, { status: 503 })

    const client = glClient()

    // Check tx receipt first
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null)
    if (!receipt) return NextResponse.json({ status: "pending", message: "Transaction not yet finalised" })

    // Read has_case first  -  fastest check
    const exists = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "has_case",
      args: [caseId],
    }).catch(() => false)

    if (!exists) {
      return NextResponse.json({ status: "processing", message: "Case not yet in contract state" })
    }

    // Read case status
    const caseStatus = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_case_status",
      args: [caseId],
    }).catch(() => "") as string

    if (caseStatus !== "finalized" && caseStatus !== "rechecked") {
      return NextResponse.json({ status: "processing", message: `Contract case status: ${caseStatus}` })
    }

    // Read summary card
    const cardJson = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_case_summary_card",
      args: [caseId],
    }) as string

    // Read full decision for reasoning + consensus fields
    const decisionJson = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_latest_decision",
      args: [caseId],
    }) as string

    console.log("[genlayer/sync-verdict] summary_card:", cardJson?.slice(0, 300))
    console.log("[genlayer/sync-verdict] latest_decision:", decisionJson?.slice(0, 300))

    const card = JSON.parse(cardJson) as Record<string, unknown>
    const decision = JSON.parse(decisionJson) as Record<string, unknown>
    const consensus = (decision.consensus ?? {}) as Record<string, unknown>

    const verdictData = {
      verdict:           String(card.verdict ?? consensus.verdict ?? "requires_human_review"),
      datasetAction:     String(card.dataset_action ?? consensus.dataset_action ?? ""),
      severity:          String(card.severity ?? consensus.severity ?? "medium"),
      confidenceLabel:   String(card.confidence_label ?? consensus.confidence_label ?? "medium"),
      selectedOutcome:   String(card.governance_class ?? consensus.selected_outcome ?? ""),
      reasoningSummary:  String(consensus.reasoning_summary ?? ""),
      fixAssessment:     String(consensus.fix_assessment ?? ""),
      downstreamRisk:    String(consensus.downstream_risk ?? ""),
      evidenceDigest:    String(card.evidence_hash ?? ""),
      consensusTimestamp: new Date().toISOString(),
      fixSafety:         String(card.fix_safety ?? consensus.fix_safety ?? ""),
      evidenceGrade:     String(card.evidence_grade ?? consensus.evidence_grade ?? ""),
      contractAlignment: String(consensus.data_contract_alignment ?? ""),
      finalStatus:       caseStatus,
    }

    const admin = createAdminClient()

    await admin.from("genlayer_governance_verdicts").upsert({
      user_id: user.id,
      governance_case_id: caseId,
      contract_address: contractAddress,
      transaction_hash: txHash,
      case_id_on_chain: caseId,
      verdict: verdictData.verdict,
      dataset_action: verdictData.datasetAction,
      severity: verdictData.severity,
      confidence_label: verdictData.confidenceLabel,
      selected_outcome: verdictData.selectedOutcome,
      reasoning_summary: verdictData.reasoningSummary,
      evidence_digest: verdictData.evidenceDigest,
      fix_assessment: verdictData.fixAssessment,
      downstream_risk: verdictData.downstreamRisk,
      consensus_status: "finalized",
      consensus_timestamp: verdictData.consensusTimestamp,
    }, { onConflict: "contract_address,governance_case_id" })

    await admin.from("governance_cases").update({ status: "verdict_received" }).eq("id", caseId)
    await admin.from("contract_activity_logs").update({ status: "finalized" }).eq("transaction_hash", txHash)

    return NextResponse.json({ status: "finalized", verdict: verdictData })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[genlayer/sync-verdict]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
