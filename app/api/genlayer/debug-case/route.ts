import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createGlClient, chains } from "genlayer-js"
import type { Hash } from "genlayer-js/types"
import { ethers } from "ethers"

const SUBMIT_CASE_ABI = [
  "function submit_case(" +
    "string case_id,string dataset_name,string dataset_purpose,string data_domain," +
    "string downstream_consumer,string business_criticality,string issue_type," +
    "string affected_columns,string missingness_summary,string duplication_summary," +
    "string schema_drift_summary,string freshness_summary,string validity_summary," +
    "string volume_summary,string historical_baseline_summary,string proposed_fix," +
    "string rollback_plan,string data_contract_summary,string sample_rows_hash," +
    "string schema_snapshot_hash,string evidence_hash,string evidence_manifest_hash," +
    "string public_evidence_urls,string analyst_notes,string candidate_outcome_a," +
    "string candidate_outcome_b,string candidate_outcome_c" +
  ")",
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get("caseId")
  const txHash = searchParams.get("txHash")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const contractAddress = process.env.GENLAYER_CONTRACT_ADDRESS
  if (!contractAddress) return NextResponse.json({ error: "Contract not configured" }, { status: 503 })

  const rpcUrl = process.env.GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api"

  const client = createGlClient({
    chain: {
      ...chains.studionet,
      rpcUrls: { default: { http: [rpcUrl] } },
    },
  })

  const result: Record<string, unknown> = { contractAddress, rpcUrl, caseId }

  // 1. Decode calldata from sim_config (GenLayer stores raw tx in sim_config)
  if (txHash) {
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash as Hash }).catch(() => null)
      if (receipt) {
        result.tx_execution_result = {
          status: (receipt as any).status,
          txExecutionResultName: (receipt as any).txExecutionResultName,
          transactionResultName: (receipt as any).transactionResultName,
        }
      }
      const txData = await client.getTransaction({ hash: txHash as Hash })
      const iface = new ethers.Interface(SUBMIT_CASE_ABI)
      // GenLayer tx data may be in input or extracted from sim_config
      const rawInput = (txData as any)?.input ?? (txData as any)?.data
      if (rawInput && rawInput !== "0x") {
        const decoded = iface.parseTransaction({ data: rawInput })
        result.calldata = {
          functionName: decoded?.name,
          argCount: decoded?.args.length,
          case_id: decoded?.args[0],
          evidence_hash: decoded?.args[20],
          evidence_manifest_hash: decoded?.args[21],
          sample_rows_hash: decoded?.args[18],
        }
      } else {
        result.calldata = { note: "input not accessible via standard getTransaction on GenLayer  -  check sim_config in explorer" }
      }
    } catch (e) { result.tx_error = String(e) }
  }

  if (!caseId) return NextResponse.json(result)

  // 2. has_case
  try {
    result.has_case = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "has_case",
      args: [caseId],
    })
  } catch (e) { result.has_case_error = String(e) }

  // 3. get_case_status
  try {
    result.case_status = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_case_status",
      args: [caseId],
    })
  } catch (e) { result.case_status_error = String(e) }

  // 4. get_case_version
  try {
    result.case_version = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_case_version",
      args: [caseId],
    })
  } catch (e) { result.case_version_error = String(e) }

  // 5. get_case_summary_card
  try {
    const json = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_case_summary_card",
      args: [caseId],
    }) as string
    result.get_case_summary_card = JSON.parse(json)
  } catch (e) { result.summary_card_error = String(e) }

  // 6. get_latest_decision
  try {
    const json = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_latest_decision",
      args: [caseId],
    }) as string
    result.get_latest_decision = JSON.parse(json)
  } catch (e) { result.latest_decision_error = String(e) }

  return NextResponse.json(result)
}
