import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import AdminNoteForm from "@/components/admin/AdminNoteForm"

export const metadata = { title: "Admin" }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profileRow } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single()
  const role = profileRow?.role

  if (role !== "admin") {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 640, textAlign: "center" }}>
        <div className="audit-panel" style={{ padding: 48 }}>
          <h1 className="text-page-title mb-4" style={{ color: "var(--control-ink)" }}>Access Denied</h1>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)" }}>
            This area is restricted to Qualora administrators.
          </p>
        </div>
      </div>
    )
  }

  const admin = createAdminClient()
  const [
    { count: userCount },
    { count: caseCount },
    { count: verdictCount },
    { count: failedCount },
    { data: allUsers },
    { data: allCases },
    { data: failedCases },
    { data: recentReviewNotes },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("governance_cases").select("id", { count: "exact", head: true }),
    admin.from("genlayer_governance_verdicts").select("id", { count: "exact", head: true }),
    admin.from("governance_cases").select("id", { count: "exact", head: true }).eq("status", "genlayer_failed"),
    admin.from("profiles").select("user_id, display_name, email, organisation, role, created_at").order("created_at", { ascending: false }).limit(50),
    admin.from("governance_cases").select("id, issue_type, status, created_at, user_id, datasets(name), genlayer_governance_verdicts(verdict)").order("created_at", { ascending: false }).limit(30),
    admin.from("governance_cases").select("id, issue_type, status, created_at, user_id, datasets(name)").eq("status", "genlayer_failed").order("created_at", { ascending: false }),
    admin.from("admin_review_notes").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(10),
  ])

  return (
    <div style={{ padding: "28px 32px" }}>
      <h1 className="text-page-title mb-6" style={{ color: "var(--control-ink)" }}>Admin Console</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total users", value: userCount ?? 0, color: "var(--control-ink)" },
          { label: "Total cases", value: caseCount ?? 0, color: "var(--control-ink)" },
          { label: "Total verdicts", value: verdictCount ?? 0, color: "var(--governance-green)" },
          { label: "Failed cases", value: failedCount ?? 0, color: failedCount ? "var(--quarantine-red)" : "var(--metadata-grey)" },
        ].map((s) => (
          <div key={s.label} className="audit-panel" style={{ padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 36, fontFamily: "var(--font-archivo)", fontWeight: 700, color: s.color }}>
              {s.value}
            </p>
            <p style={{ fontSize: 13, color: "var(--metadata-grey)", marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Failed cases */}
      {!!failedCases?.length && (
        <div className="audit-panel" style={{ marginBottom: 24, overflow: "hidden", borderColor: "rgba(220,38,38,0.25)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(220,38,38,0.15)", background: "rgba(220,38,38,0.04)" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--quarantine-red)", fontFamily: "var(--font-archivo)" }}>Failed GenLayer Submissions</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Case", "Dataset", "User", "Date"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--metadata-grey)", letterSpacing: "0.05em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {failedCases.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/app/cases/${c.id}`} style={{ fontSize: 13, color: "var(--quarantine-red)", textDecoration: "none", fontWeight: 600 }}>
                      {c.issue_type?.replace(/_/g, " ")}
                    </Link>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-roboto-mono)", color: "var(--metadata-grey)", marginTop: 2 }}>{c.id.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--control-ink)" }}>{(c as any).datasets?.name ?? " - "}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "var(--font-roboto-mono)", color: "var(--metadata-grey)" }}>{c.user_id?.slice(0, 8)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--metadata-grey)" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All cases */}
      <div className="audit-panel" style={{ marginBottom: 24, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--schema-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--control-ink)", fontFamily: "var(--font-archivo)" }}>All Cases (latest 30)</p>
          <Link href="/app/cases" style={{ fontSize: 12, color: "var(--validation-cyan)" }}>View own →</Link>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {["Case", "Dataset", "Status", "Verdict", "User", "Date"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--metadata-grey)", letterSpacing: "0.05em" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(allCases ?? []).map((c: any) => {
              const raw = c.genlayer_governance_verdicts
              const verdict = Array.isArray(raw) ? raw[0]?.verdict : raw?.verdict
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/app/cases/${c.id}`} style={{ fontSize: 13, color: "var(--validation-cyan)", textDecoration: "none", fontWeight: 600 }}>
                      {c.issue_type?.replace(/_/g, " ")}
                    </Link>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-roboto-mono)", color: "var(--metadata-grey)", marginTop: 2 }}>{c.id.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--control-ink)" }}>{c.datasets?.name ?? " - "}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "rgba(100,116,139,0.10)", color: "var(--metadata-grey)", textTransform: "uppercase" }}>
                      {c.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {verdict ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: verdictColor(verdict) }}>
                        {verdict.replace(/_/g, " ")}
                      </span>
                    ) : <span style={{ color: "var(--metadata-grey)", fontSize: 12 }}> - </span>}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "var(--font-roboto-mono)", color: "var(--metadata-grey)" }}>{c.user_id?.slice(0, 8)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--metadata-grey)" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* User list */}
      <div className="audit-panel" style={{ marginBottom: 24, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--schema-line)" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--control-ink)", fontFamily: "var(--font-archivo)" }}>All Users</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {["Name", "Email", "Organisation", "Role", "Joined"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--metadata-grey)", letterSpacing: "0.05em" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(allUsers ?? []).map((u: any) => (
              <tr key={u.user_id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--control-ink)", fontWeight: 600 }}>
                  {u.display_name ?? " - "}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--metadata-grey)" }}>{u.email ?? " - "}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--metadata-grey)" }}>{u.organisation ?? " - "}</td>
                <td style={{ padding: "12px 16px" }}>
                  {u.role === "admin" ? (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "rgba(124,58,237,0.15)", color: "var(--consensus-violet)", textTransform: "uppercase" }}>Admin</span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--metadata-grey)" }}>Member</span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--metadata-grey)" }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : " - "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admin notes */}
      <div className="audit-panel" style={{ padding: 24 }}>
        <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>RECENT ADMIN NOTES</p>
        {!recentReviewNotes?.length && (
          <p style={{ fontSize: 13, color: "var(--metadata-grey)" }}>No admin notes yet.</p>
        )}
        {recentReviewNotes?.map((note: any) => (
          <div key={note.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.6 }}>{note.note}</p>
            <p style={{ fontSize: 11, color: "var(--metadata-grey)", marginTop: 4 }}>
              {note.profiles?.display_name ?? note.admin_user_id} · {new Date(note.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        <AdminNoteForm adminUserId={user.id} />
      </div>
    </div>
  )
}

function verdictColor(verdict: string): string {
  const m: Record<string, string> = {
    approved: "var(--governance-green)",
    approved_with_warning: "var(--policy-amber)",
    quarantine_dataset: "var(--quarantine-red)",
    reject_proposed_fix: "var(--quarantine-red)",
    requires_human_review: "var(--review-indigo)",
    needs_more_evidence: "var(--metadata-grey)",
  }
  return m[verdict] ?? "var(--metadata-grey)"
}
