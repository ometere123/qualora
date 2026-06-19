import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus, FolderOpen } from "lucide-react"

export const metadata = { title: "Governance Cases" }

export default async function CasesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: cases } = await supabase
    .from("governance_cases")
    .select(`id, issue_type, status, created_at, updated_at, datasets(name), genlayer_governance_verdicts(verdict, severity)`)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  return (
    <div style={{ padding: "28px 32px" }}>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>Governance Cases</h1>
          <p className="text-meta mt-1">All data quality governance cases submitted for adjudication</p>
        </div>
        <Link href="/app/cases/new" className="btn-primary">
          <Plus size={14} /> New case
        </Link>
      </div>

      {(!cases || cases.length === 0) ? (
        <div className="audit-panel" style={{ padding: 48, textAlign: "center", maxWidth: 480, margin: "60px auto" }}>
          <FolderOpen size={28} color="var(--dormant-slate)" style={{ margin: "0 auto 16px" }} />
          <h2 className="text-card-title mb-2">No governance cases</h2>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)", marginBottom: 24 }}>
            Create a case to send a data quality issue to GenLayer for consensus-backed adjudication.
          </p>
          <Link href="/app/cases/new" className="btn-primary">Create first case</Link>
        </div>
      ) : (
        <div className="audit-panel" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--schema-line)", background: "var(--frosted-panel)" }}>
                {["Case", "Dataset", "Status", "Verdict", ""].map((h) => (
                  <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--metadata-grey)", fontFamily: "var(--font-source-sans)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(cases as any[]).map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--schema-line)" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)" }}>
                      {c.issue_type.replace(/_/g, " ")}
                    </p>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-roboto-mono)", color: "var(--metadata-grey)", marginTop: 3 }}>
                      {c.id.slice(0, 8).toUpperCase()}
                    </p>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--metadata-grey)" }}>
                    {c.datasets?.name ?? "—"}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className={`verdict-badge ${statusClass(c.status)}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {(() => {
                      const raw = c.genlayer_governance_verdicts
                      const v = Array.isArray(raw) ? raw[0]?.verdict : raw?.verdict
                      return v ? (
                        <span className={`verdict-badge ${verdictClass(v)}`}>
                          {v.replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--dormant-slate)" }}>—</span>
                      )
                    })()}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <Link href={`/app/cases/${c.id}`} style={{ fontSize: 12, color: "var(--validation-cyan)" }}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function statusClass(s: string) { const m: Record<string, string> = { draft: "verdict-needs-evidence", evidence_attached: "verdict-needs-evidence", submitted_to_genlayer: "verdict-pending", pending_consensus: "verdict-pending", verdict_received: "verdict-approved", closed: "verdict-approved" }; return m[s] ?? "verdict-needs-evidence" }
function verdictClass(v: string) { const m: Record<string, string> = { approved: "verdict-approved", approved_with_warning: "verdict-approved-warning", quarantine_dataset: "verdict-quarantine", reject_proposed_fix: "verdict-rejected", requires_human_review: "verdict-human-review", needs_more_evidence: "verdict-needs-evidence" }; return m[v] ?? "verdict-needs-evidence" }
