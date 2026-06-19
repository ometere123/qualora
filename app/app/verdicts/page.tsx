import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"

export const metadata = { title: "Verdicts" }

export default async function VerdictsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user!.id).single()
  const isAdmin = profile?.role === "admin"

  const SELECT = `*, governance_cases(title, issue_type, datasets(name))`
  const { data: verdicts } = isAdmin
    ? await createAdminClient()
        .from("genlayer_governance_verdicts")
        .select(SELECT)
        .order("created_at", { ascending: false })
    : await supabase
        .from("genlayer_governance_verdicts")
        .select(SELECT)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })

  return (
    <div style={{ padding: "28px 32px" }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>Governance Verdicts</h1>
        <div className="source-of-truth-badge">
          <span className="status-dot" />
          Source of truth: GenLayer Contract
        </div>
      </div>

      {!verdicts?.length && (
        <div className="audit-panel" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)", marginBottom: 20 }}>
            No verdicts issued yet. Submit a governance case to GenLayer to receive a binding verdict.
          </p>
          <Link href="/app/cases/new" className="btn-genlayer">Open new case</Link>
        </div>
      )}

      {!!verdicts?.length && (
        <div className="audit-panel" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Case", "Dataset", "Verdict", "Severity", "Confidence", "Finalized"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--metadata-grey)", letterSpacing: "0.05em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {verdicts.map((v: any) => (
                <tr key={v.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/app/consensus/${v.governance_case_id}`} style={{ fontSize: 13, color: "var(--validation-cyan)", textDecoration: "none" }}>
                      {v.governance_cases?.title ?? v.governance_case_id?.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--control-ink)" }}>
                    {v.governance_cases?.datasets?.name ?? "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className={`verdict-badge verdict-${v.verdict?.replace(/_/g, "-")}`}>
                      {v.verdict?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--control-ink)", textTransform: "capitalize" }}>
                    {v.severity}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--control-ink)", textTransform: "capitalize" }}>
                    {v.confidence_label?.replace(/_/g, " ")}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--metadata-grey)", fontFamily: "var(--font-roboto-mono)" }}>
                    {v.consensus_timestamp ? new Date(v.consensus_timestamp).toLocaleDateString() : "—"}
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
