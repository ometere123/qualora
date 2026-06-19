import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"

export const metadata = { title: "Dataset Detail" }

export default async function DatasetDetailPage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dataset } = await supabase
    .from("datasets")
    .select("*")
    .eq("id", datasetId)
    .eq("user_id", user!.id)
    .single()

  if (!dataset) notFound()

  const { data: cases } = await supabase
    .from("governance_cases")
    .select("id, issue_type, status, created_at, genlayer_governance_verdicts(verdict)")
    .eq("dataset_id", datasetId)
    .order("created_at", { ascending: false })

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      <div className="flex items-center gap-3 mb-7">
        <Link href="/app/datasets" style={{ fontSize: 13, color: "var(--metadata-grey)" }}>← Datasets</Link>
        <span style={{ color: "var(--schema-line)" }}>/</span>
        <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>{dataset.name}</h1>
        <span className={`verdict-badge ${dataset.governance_status === "quarantined" ? "verdict-quarantine" : "verdict-approved"}`}>
          {dataset.governance_status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { label: "Domain", value: dataset.domain },
          { label: "Owner", value: dataset.owner_name },
          { label: "Source system", value: dataset.source_system },
          { label: "Refresh cadence", value: dataset.refresh_cadence },
          { label: "Business criticality", value: dataset.business_criticality },
          { label: "Primary key", value: dataset.expected_primary_key },
        ].map((f) => (
          <div key={f.label} className="audit-panel" style={{ padding: "16px 20px" }}>
            <p className="text-meta mb-1">{f.label}</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)" }}>{f.value || "—"}</p>
          </div>
        ))}
      </div>

      {dataset.downstream_consumers && (
        <div className="audit-panel" style={{ padding: "20px 24px", marginBottom: 20 }}>
          <p className="form-label">Downstream consumers</p>
          <p style={{ fontSize: 14, color: "var(--control-ink)", lineHeight: 1.6 }}>{dataset.downstream_consumers}</p>
        </div>
      )}

      {dataset.schema_summary && (
        <div className="audit-panel" style={{ padding: "20px 24px", marginBottom: 20 }}>
          <p className="form-label">Schema summary</p>
          <p style={{ fontSize: 14, color: "var(--control-ink)", lineHeight: 1.6, fontFamily: "var(--font-source-sans)" }}>{dataset.schema_summary}</p>
        </div>
      )}

      <div className="audit-panel" style={{ overflow: "hidden", marginTop: 28 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--schema-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)", fontFamily: "var(--font-archivo)" }}>
            Governance Cases
          </p>
          <Link href={`/app/cases/new?datasetId=${datasetId}`} className="btn-primary btn-sm">
            <Plus size={13} /> New case
          </Link>
        </div>
        {(!cases || cases.length === 0) ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--metadata-grey)" }}>No governance cases for this dataset.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {(cases as any[]).map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--schema-line)" }}>
                  <td style={{ padding: "13px 20px" }}>
                    <Link href={`/app/cases/${c.id}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)" }}>
                      {c.issue_type.replace(/_/g, " ")}
                    </Link>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-roboto-mono)", color: "var(--metadata-grey)", marginTop: 2 }}>
                      {c.id.slice(0, 8).toUpperCase()}
                    </p>
                  </td>
                  <td style={{ padding: "13px 20px", textAlign: "right" }}>
                    {c.genlayer_governance_verdicts?.verdict ? (
                      <span className={`verdict-badge ${verdictClass(c.genlayer_governance_verdicts.verdict)}`}>
                        {c.genlayer_governance_verdicts.verdict.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className={`verdict-badge ${statusClass(c.status)}`}>{c.status.replace(/_/g, " ")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function verdictClass(v: string) {
  const m: Record<string, string> = { approved: "verdict-approved", approved_with_warning: "verdict-approved-warning", quarantine_dataset: "verdict-quarantine", reject_proposed_fix: "verdict-rejected", requires_human_review: "verdict-human-review", needs_more_evidence: "verdict-needs-evidence" }
  return m[v] ?? "verdict-needs-evidence"
}
function statusClass(s: string) {
  const m: Record<string, string> = { draft: "verdict-needs-evidence", evidence_attached: "verdict-needs-evidence", submitted_to_genlayer: "verdict-pending", pending_consensus: "verdict-pending", verdict_received: "verdict-approved" }
  return m[s] ?? "verdict-needs-evidence"
}
