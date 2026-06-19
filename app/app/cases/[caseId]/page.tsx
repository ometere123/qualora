import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import SubmitToGenLayerButton from "@/components/consensus/SubmitToGenLayerButton"

export const metadata = { title: "Case Detail" }

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: c } = await supabase
    .from("governance_cases")
    .select(`*, datasets(*), evidence_files(*)`)
    .eq("id", caseId)
    .eq("user_id", user!.id)
    .single()

  if (!c) notFound()

  // Query verdict separately — join via PostgREST embed can miss rows when RLS
  // policies don't align perfectly with the join context
  const { data: verdictRow } = await supabase
    .from("genlayer_governance_verdicts")
    .select("*")
    .eq("governance_case_id", caseId)
    .maybeSingle()

  const verdict = verdictRow ?? null
  const dataset = (c as any).datasets
  const evidence = (c as any).evidence_files ?? []

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/cases" style={{ fontSize: 13, color: "var(--metadata-grey)" }}>← Cases</Link>
        <span style={{ color: "var(--schema-line)" }}>/</span>
        <span style={{ fontSize: 13, fontFamily: "var(--font-roboto-mono)", color: "var(--control-ink)" }}>
          {caseId.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-page-title mb-2" style={{ color: "var(--control-ink)" }}>
            {c.issue_type.replace(/_/g, " ")}
          </h1>
          <div className="flex items-center gap-3">
            <span className={`verdict-badge ${statusClass(c.status)}`}>
              {c.status.replace(/_/g, " ")}
            </span>
            {dataset && (
              <Link href={`/app/datasets/${dataset.id}`} style={{ fontSize: 13, color: "var(--metadata-grey)" }}>
                {dataset.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          {verdict?.verdict === "needs_more_evidence" ? (
            <>
              <Link href={`/app/consensus/${caseId}`} className="btn-secondary">View verdict</Link>
              <SubmitToGenLayerButton caseId={caseId} caseData={c} />
            </>
          ) : (verdict || c.status === "verdict_received" || c.status === "pending_consensus" || c.status === "submitted_to_genlayer") ? (
            <Link href={`/app/consensus/${caseId}`} className="btn-genlayer">View Consensus Chamber</Link>
          ) : (
            <SubmitToGenLayerButton caseId={caseId} caseData={c} />
          )}
        </div>
      </div>

      {/* Needs more evidence banner */}
      {verdict?.verdict === "needs_more_evidence" && (
        <div style={{ marginBottom: 24, padding: "20px 24px", background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.25)", borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.30)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>⚠</span>
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-archivo)", fontSize: 15, fontWeight: 700, color: "var(--policy-amber)", marginBottom: 6 }}>
              GenLayer validators need more evidence
            </p>
            <p style={{ fontSize: 13, color: "var(--metadata-grey)", lineHeight: 1.7, marginBottom: 12 }}>
              The validators could not reach a confident verdict with the current evidence. Upload additional files — statistical summaries, schema snapshots, or CSV samples — then resubmit to GenLayer.
            </p>
            {verdict.reasoning_summary && (
              <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 12 }}>
                &ldquo;{verdict.reasoning_summary}&rdquo;
              </p>
            )}
            <SubmitToGenLayerButton caseId={caseId} caseData={c} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Case facts */}
        <div className="audit-panel" style={{ padding: 24 }}>
          <h2 className="text-panel-title mb-5">Case facts</h2>
          <div className="flex flex-col gap-4">
            {[
              { label: "Issue type", value: c.issue_type.replace(/_/g, " ") },
              { label: "Affected columns", value: c.affected_columns },
              { label: "Missingness", value: c.missingness_summary },
              { label: "Duplication", value: c.duplication_summary },
              { label: "Schema drift", value: c.schema_drift_summary },
              { label: "Freshness", value: c.freshness_summary },
              { label: "Invalid values", value: c.invalid_values_summary },
              { label: "Historical baseline", value: c.historical_baseline_summary },
            ]
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label} style={{ paddingBottom: 12, borderBottom: "1px solid var(--schema-line)" }}>
                  <p className="text-meta mb-1">{f.label}</p>
                  <p style={{ fontSize: 14, color: "var(--control-ink)", lineHeight: 1.6 }}>{f.value}</p>
                </div>
              ))}
          </div>
        </div>

        {/* Downstream & fix */}
        <div className="audit-panel" style={{ padding: 24 }}>
          <h2 className="text-panel-title mb-5">Impact &amp; proposed fix</h2>
          <div className="flex flex-col gap-4">
            {c.downstream_impact && (
              <div style={{ paddingBottom: 12, borderBottom: "1px solid var(--schema-line)" }}>
                <p className="text-meta mb-1">Downstream impact</p>
                <p style={{ fontSize: 14, color: "var(--control-ink)", lineHeight: 1.6 }}>{c.downstream_impact}</p>
              </div>
            )}
            {c.proposed_fix && (
              <div style={{ paddingBottom: 12, borderBottom: "1px solid var(--schema-line)" }}>
                <p className="text-meta mb-1">Proposed fix</p>
                <p style={{ fontSize: 14, color: "var(--control-ink)", lineHeight: 1.6 }}>{c.proposed_fix}</p>
              </div>
            )}
            {c.analyst_notes && (
              <div>
                <p className="text-meta mb-1">Analyst notes</p>
                <p style={{ fontSize: 14, color: "var(--control-ink)", lineHeight: 1.6 }}>{c.analyst_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Candidate outcomes */}
        {(c.candidate_outcome_a || c.candidate_outcome_b || c.candidate_outcome_c) && (
          <div className="audit-panel" style={{ padding: 24 }}>
            <h2 className="text-panel-title mb-4">Candidate outcomes</h2>
            <p style={{ fontSize: 12, color: "var(--metadata-grey)", marginBottom: 14, lineHeight: 1.5 }}>
              Application-prepared possibilities. GenLayer validators make the final determination.
            </p>
            {[c.candidate_outcome_a, c.candidate_outcome_b, c.candidate_outcome_c]
              .filter(Boolean)
              .map((outcome, i) => (
                <div key={i} style={{ padding: "12px 14px", background: "var(--frosted-panel)", borderRadius: 8, marginBottom: 8, border: "1px solid var(--schema-line)" }}>
                  <p style={{ fontSize: 11, color: "var(--dormant-slate)", marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em" }}>
                    CANDIDATE {String.fromCharCode(65 + i)}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--control-ink)" }}>{outcome}</p>
                </div>
              ))}
          </div>
        )}

        {/* Evidence */}
        <div className="audit-panel" style={{ padding: 24 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-panel-title">Evidence</h2>
            <Link href={`/app/evidence?caseId=${caseId}`} style={{ fontSize: 12, color: "var(--validation-cyan)" }}>
              Manage evidence
            </Link>
          </div>
          {evidence.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--metadata-grey)" }}>No evidence attached yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {evidence.map((f: any) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--frosted-panel)", borderRadius: 8, border: "1px solid var(--schema-line)" }}>
                  <div>
                    <p style={{ fontSize: 13, color: "var(--control-ink)", fontWeight: 600 }}>{f.file_type.toUpperCase()}</p>
                    <p className="hash-block mt-1" style={{ display: "inline-block" }}>{f.file_hash?.slice(0, 16) ?? f.evidence_hash?.slice(0, 16) ?? "—"}…</p>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--metadata-grey)" }}>
                    {(f.file_size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GenLayer verdict (if exists) */}
        {verdict && (
          <div
            className="audit-panel lg:col-span-2"
            style={{ padding: 24, borderColor: "rgba(124,58,237,0.25)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-panel-title" style={{ color: "var(--consensus-violet)" }}>
                GenLayer Verdict
              </h2>
              <div className="source-of-truth-badge">
                <span className="status-dot" />
                GenLayer Intelligent Contract
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-meta mb-1">Verdict</p>
                <span className={`verdict-badge ${verdictClass(verdict?.verdict)}`}>
                  {verdict?.verdict?.replace(/_/g, " ") ?? "—"}
                </span>
              </div>
              <div>
                <p className="text-meta mb-1">Severity</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)" }}>{verdict?.severity ?? "—"}</p>
              </div>
              <div>
                <p className="text-meta mb-1">Confidence</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)" }}>{verdict?.confidence_label ?? "—"}</p>
              </div>
              <div>
                <p className="text-meta mb-1">Dataset action</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)" }}>{verdict?.dataset_action ?? "—"}</p>
              </div>
            </div>
            {verdict.reasoning_summary && (
              <div style={{ background: "rgba(124,58,237,0.05)", borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
                <p className="text-meta mb-2">Reasoning summary</p>
                <p style={{ fontSize: 14, color: "var(--control-ink)", lineHeight: 1.7 }}>{verdict.reasoning_summary}</p>
              </div>
            )}
            <div className="flex gap-3">
              <div>
                <p className="text-meta mb-1">Transaction</p>
                <a
                  href={`https://explorer-studio.genlayer.com/tx/${verdict.transaction_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hash-block"
                  style={{ color: "var(--validation-cyan)", textDecoration: "none" }}
                  title={verdict.transaction_hash}
                >
                  {verdict.transaction_hash}
                </a>
              </div>
              <div>
                <p className="text-meta mb-1">Contract</p>
                <span className="hash-block">{verdict.contract_address}</span>
              </div>
            </div>
            <div className="mt-4">
              <Link href={`/app/consensus/${caseId}`} className="btn-genlayer btn-sm">
                Open Consensus Chamber
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function statusClass(s: string) {
  const m: Record<string, string> = { draft: "verdict-needs-evidence", evidence_attached: "verdict-needs-evidence", submitted_to_genlayer: "verdict-pending", pending_consensus: "verdict-pending", verdict_received: "verdict-approved", closed: "verdict-approved" }
  return m[s] ?? "verdict-needs-evidence"
}
function verdictClass(v: string) {
  const m: Record<string, string> = { approved: "verdict-approved", approved_with_warning: "verdict-approved-warning", quarantine_dataset: "verdict-quarantine", reject_proposed_fix: "verdict-rejected", requires_human_review: "verdict-human-review", needs_more_evidence: "verdict-needs-evidence" }
  return m[v] ?? "verdict-needs-evidence"
}
