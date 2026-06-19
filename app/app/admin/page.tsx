import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const metadata = { title: "Admin" }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Check admin role from profiles table (authoritative — no JWT refresh needed)
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
            Contact your workspace administrator to request access.
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
    { data: recentReviewNotes },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("governance_cases").select("id", { count: "exact", head: true }),
    admin.from("genlayer_governance_verdicts").select("id", { count: "exact", head: true }),
    admin.from("admin_review_notes").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(10),
  ])

  return (
    <div style={{ padding: "28px 32px" }}>
      <h1 className="text-page-title mb-6" style={{ color: "var(--control-ink)" }}>Admin Console</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total users", value: userCount ?? 0 },
          { label: "Total cases", value: caseCount ?? 0 },
          { label: "Total verdicts", value: verdictCount ?? 0 },
        ].map((s) => (
          <div key={s.label} className="audit-panel" style={{ padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 36, fontFamily: "var(--font-archivo)", fontWeight: 700, color: "var(--control-ink)" }}>
              {s.value}
            </p>
            <p style={{ fontSize: 13, color: "var(--metadata-grey)", marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

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
      </div>
    </div>
  )
}
