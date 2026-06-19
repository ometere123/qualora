import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient as createGlClient, chains } from "genlayer-js"
import type { CSSProperties } from "react"

export const metadata = { title: "Consensus Chamber" }

// Read both views from GenLayer — contract is the authoritative source of truth
async function readContractVerdict(caseId: string): Promise<{
  summary: Record<string, unknown> | null
  decision: Record<string, unknown> | null
  consensus: Record<string, unknown>
}> {
  const contractAddress = process.env.GENLAYER_CONTRACT_ADDRESS
  const rpcUrl = process.env.GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api"
  if (!contractAddress) return { summary: null, decision: null, consensus: {} }

  try {
    const client = createGlClient({
      chain: { ...chains.studionet, rpcUrls: { default: { http: [rpcUrl] } } },
    })

    const [summaryJson, decisionJson] = await Promise.all([
      client.readContract({
        address: contractAddress as `0x${string}`,
        functionName: "get_case_summary_card",
        args: [caseId],
      }) as Promise<string>,
      client.readContract({
        address: contractAddress as `0x${string}`,
        functionName: "get_latest_decision",
        args: [caseId],
      }) as Promise<string>,
    ])

    const summary = JSON.parse(summaryJson) as Record<string, unknown>
    const decision = JSON.parse(decisionJson) as Record<string, unknown>
    const consensus = (decision.consensus ?? {}) as Record<string, unknown>

    return { summary, decision, consensus }
  } catch {
    return { summary: null, decision: null, consensus: {} }
  }
}

export default async function ConsensusChamberPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: c } = await supabase
    .from("governance_cases")
    .select(`*, datasets(*)`)
    .eq("id", caseId)
    .eq("user_id", user!.id)
    .single()

  if (!c) notFound()

  // Supabase mirror — used for tx hash, contract address, timestamps
  const { data: supabaseVerdict } = await supabase
    .from("genlayer_governance_verdicts")
    .select("*")
    .eq("governance_case_id", caseId)
    .maybeSingle()

  // GenLayer contract — authoritative source of truth for all governance fields
  const { summary, decision, consensus } = await readContractVerdict(caseId)

  const caseFound = summary?.found === true
  const dataset = (c as any).datasets
  const isPending = c.status === "pending_consensus" || c.status === "submitted_to_genlayer"
  const hasVerdict = caseFound || !!supabaseVerdict

  // Merge: GenLayer contract fields take priority; Supabase mirror fills tx/contract meta
  const verdict = caseFound ? {
    verdict:               String(summary!.verdict ?? ""),
    governance_class:      String(summary!.governance_class ?? ""),
    severity:              String(summary!.severity ?? ""),
    confidence_label:      String(summary!.confidence_label ?? ""),
    evidence_grade:        String(summary!.evidence_grade ?? ""),
    fix_safety:            String(summary!.fix_safety ?? ""),
    dataset_action:        String(summary!.dataset_action ?? ""),
    reasoning_summary:     String(consensus.reasoning_summary ?? ""),
    fix_assessment:        String(consensus.fix_assessment ?? ""),
    downstream_risk:       String(consensus.downstream_risk ?? ""),
    required_controls:     String(consensus.required_controls ?? ""),
    required_next_steps:   String(consensus.required_next_steps ?? ""),
    expiry_condition:      String(consensus.expiry_condition ?? ""),
    appeal_recommendation: String(consensus.appeal_recommendation ?? ""),
    evidence_hash:         String((decision?.integrity as any)?.evidence_hash ?? summary!.evidence_hash ?? ""),
    contract_address:      supabaseVerdict?.contract_address ?? process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ?? "",
    transaction_hash:      supabaseVerdict?.transaction_hash ?? "",
    consensus_timestamp:   supabaseVerdict?.consensus_timestamp ?? "",
  } : null

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/app/cases/${caseId}`} style={{ fontSize: 13, color: "var(--metadata-grey)" }}>
            ← Case {caseId.slice(0, 8).toUpperCase()}
          </Link>
          <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>
            Consensus Chamber
          </h1>
        </div>
        <div className="source-of-truth-badge">
          <span className="status-dot" />
          Source of truth: GenLayer Intelligent Contract
        </div>
      </div>

      {/* Pending */}
      {isPending && !hasVerdict && (
        <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.22)", borderRadius: 12, padding: "40px 32px", textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--consensus-violet)", animation: "pulse-violet 1.8s ease-in-out infinite" }} />
          </div>
          <h2 className="text-panel-title mb-2" style={{ color: "var(--consensus-violet)" }}>Validators are deliberating</h2>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
            This case has been submitted to the GenLayer Intelligent Contract. Validators are independently classifying the issue, evaluating the proposed fix, and reaching consensus on the governance outcome.
          </p>
        </div>
      )}

      {/* Not submitted yet */}
      {!hasVerdict && !isPending && (
        <div className="audit-panel" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)", marginBottom: 20 }}>This case has not been submitted to GenLayer yet.</p>
          <Link href={`/app/cases/${caseId}`} className="btn-primary">Open case to submit</Link>
        </div>
      )}

      {/* Verdict — read from GenLayer contract */}
      {verdict && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* LEFT column — case context + verdict seal */}
          <div className="flex flex-col gap-4">

            {/* Verdict seal */}
            <div className="audit-panel genlayer-glow" style={{ padding: 28, borderColor: "rgba(124,58,237,0.30)", textAlign: "center" }}>
              <p className="text-badge-label mb-4" style={{ color: "var(--consensus-violet)" }}>GENLAYER VERDICT</p>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 24px", borderRadius: 10, marginBottom: 20, ...verdictStyle(verdict.verdict) }}>
                <span style={{ fontFamily: "var(--font-archivo)", fontSize: 17, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {verdict.verdict.replace(/_/g, " ") || "—"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "left", marginBottom: 16 }}>
                <MetaChip label="Governance class" value={verdict.governance_class.replace(/_/g, " ")} />
                <MetaChip label="Severity" value={verdict.severity} />
                <MetaChip label="Confidence" value={verdict.confidence_label.replace(/_/g, " ")} />
                <MetaChip label="Evidence grade" value={verdict.evidence_grade} />
                <MetaChip label="Fix safety" value={verdict.fix_safety.replace(/_/g, " ")} />
              </div>
              <div className="source-of-truth-badge" style={{ justifyContent: "center" }}>
                <span className="status-dot" />
                GenLayer Intelligent Contract
              </div>
            </div>

            {/* Case facts */}
            <div className="audit-panel" style={{ padding: 24 }}>
              <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>CASE SUBMITTED</p>
              <div className="flex flex-col gap-3">
                <Field label="Dataset" value={dataset?.name ?? "—"} />
                <Field label="Issue type" value={c.issue_type?.replace(/_/g, " ") ?? "—"} />
                {c.affected_columns && <Field label="Affected columns" value={c.affected_columns} />}
                {c.downstream_impact && <Field label="Downstream impact" value={c.downstream_impact} />}
                {c.proposed_fix && <Field label="Proposed fix" value={c.proposed_fix} />}
                {verdict.evidence_hash && (
                  <div>
                    <p className="text-meta mb-1">Evidence hash</p>
                    <span className="hash-block" style={{ fontSize: 11 }}>{verdict.evidence_hash.slice(0, 32)}…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contract trace */}
            <div className="audit-panel" style={{ padding: 20 }}>
              <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>CONTRACT TRACE</p>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-meta mb-1">Contract</p>
                  <span className="hash-block" style={{ fontSize: 10 }}>{verdict.contract_address || "—"}</span>
                </div>
                {verdict.transaction_hash && (
                  <div>
                    <p className="text-meta mb-1">Transaction</p>
                    <span className="hash-block" style={{ fontSize: 10 }}>{verdict.transaction_hash}</span>
                  </div>
                )}
                {verdict.consensus_timestamp && (
                  <div>
                    <p className="text-meta mb-1">Finalized</p>
                    <p style={{ fontSize: 11, color: "var(--control-ink)", fontFamily: "var(--font-roboto-mono)" }}>
                      {new Date(verdict.consensus_timestamp).toUTCString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT column — governance instructions */}
          <div className="flex flex-col gap-4">

            {/* Dataset action */}
            <div className="audit-panel" style={{ padding: 24, borderColor: govBorderColor(verdict.verdict) }}>
              <p className="text-badge-label mb-3" style={{ color: "var(--metadata-grey)" }}>GOVERNANCE INSTRUCTION</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--control-ink)", lineHeight: 1.6, marginBottom: 8 }}>
                {verdict.dataset_action}
              </p>
              <p style={{ fontSize: 12, color: "var(--metadata-grey)" }}>
                This is the binding governance action for this dataset. The data owner must act on this before downstream use continues.
              </p>
            </div>

            {/* Reasoning summary */}
            {verdict.reasoning_summary && (
              <div className="audit-panel" style={{ padding: 24 }}>
                <p className="text-badge-label mb-3" style={{ color: "var(--metadata-grey)" }}>CONSENSUS REASONING</p>
                <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.7, fontFamily: "var(--font-source-sans)" }}>
                  {verdict.reasoning_summary}
                </p>
              </div>
            )}

            {/* Fix assessment */}
            {verdict.fix_assessment && (
              <div className="audit-panel" style={{ padding: 20 }}>
                <p className="text-badge-label mb-2" style={{ color: "var(--metadata-grey)" }}>FIX ASSESSMENT</p>
                <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.6 }}>{verdict.fix_assessment}</p>
              </div>
            )}

            {/* Downstream risk */}
            {verdict.downstream_risk && (
              <div className="audit-panel" style={{ padding: 20 }}>
                <p className="text-badge-label mb-2" style={{ color: "var(--metadata-grey)" }}>DOWNSTREAM RISK</p>
                <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.6 }}>{verdict.downstream_risk}</p>
              </div>
            )}

            {/* Required controls + next steps */}
            <div className="audit-panel" style={{ padding: 24 }}>
              <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>REQUIRED ACTIONS</p>
              <div className="flex flex-col gap-4">
                {verdict.required_controls && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--policy-amber)", letterSpacing: "0.06em", marginBottom: 6 }}>REQUIRED CONTROLS</p>
                    <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.6 }}>{verdict.required_controls}</p>
                  </div>
                )}
                {verdict.required_next_steps && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--validation-cyan)", letterSpacing: "0.06em", marginBottom: 6 }}>NEXT STEPS</p>
                    <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.6 }}>{verdict.required_next_steps}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Expiry + Appeal */}
            <div className="audit-panel" style={{ padding: 24 }}>
              <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>DECISION GOVERNANCE</p>
              <div className="flex flex-col gap-4">
                {verdict.expiry_condition && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--metadata-grey)", letterSpacing: "0.06em", marginBottom: 6 }}>EXPIRY CONDITION</p>
                    <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.6 }}>{verdict.expiry_condition}</p>
                  </div>
                )}
                {verdict.appeal_recommendation && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--metadata-grey)", letterSpacing: "0.06em", marginBottom: 6 }}>APPEAL RECOMMENDATION</p>
                    <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.6 }}>{verdict.appeal_recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supabase mirror not yet synced but case is pending */}
      {!verdict && hasVerdict && (
        <div className="audit-panel" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)", marginBottom: 12 }}>
            GenLayer consensus is finalizing. Verdict will appear here once the contract confirms.
          </p>
          <Link href={`/app/cases/${caseId}`} style={{ fontSize: 13, color: "var(--validation-cyan)" }}>
            ← Return to case
          </Link>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-meta mb-1">{label}</p>
      <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.5, fontFamily: "var(--font-source-sans)" }}>{value}</p>
    </div>
  )
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "8px 10px", background: "var(--frosted-panel)", borderRadius: 6, border: "1px solid var(--schema-line)" }}>
      <p style={{ fontSize: 10, color: "var(--metadata-grey)", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 3 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: 12, color: "var(--control-ink)", fontWeight: 600, textTransform: "capitalize" }}>{value || "—"}</p>
    </div>
  )
}

function verdictStyle(verdict: string): CSSProperties {
  const styles: Record<string, CSSProperties> = {
    approved:               { background: "rgba(5,150,105,0.10)", color: "var(--governance-green)", border: "1px solid rgba(5,150,105,0.25)" },
    approved_with_warning:  { background: "rgba(217,119,6,0.10)", color: "var(--policy-amber)", border: "1px solid rgba(217,119,6,0.25)" },
    quarantine_dataset:     { background: "rgba(220,38,38,0.10)", color: "var(--quarantine-red)", border: "1px solid rgba(220,38,38,0.25)" },
    reject_proposed_fix:    { background: "rgba(220,38,38,0.10)", color: "var(--quarantine-red)", border: "1px solid rgba(220,38,38,0.25)" },
    requires_human_review:  { background: "rgba(79,70,229,0.10)", color: "var(--review-indigo)", border: "1px solid rgba(79,70,229,0.25)" },
    needs_more_evidence:    { background: "rgba(100,116,139,0.10)", color: "var(--metadata-grey)", border: "1px solid rgba(100,116,139,0.25)" },
  }
  return styles[verdict] ?? styles.needs_more_evidence
}

function govBorderColor(verdict: string): string {
  const m: Record<string, string> = {
    approved:              "rgba(5,150,105,0.30)",
    approved_with_warning: "rgba(217,119,6,0.30)",
    quarantine_dataset:    "rgba(220,38,38,0.30)",
    reject_proposed_fix:   "rgba(220,38,38,0.30)",
    requires_human_review: "rgba(79,70,229,0.30)",
  }
  return m[verdict] ?? "var(--schema-line)"
}
