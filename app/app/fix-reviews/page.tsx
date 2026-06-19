import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export const metadata = { title: "Fix Reviews" }

export default async function FixReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Cases where a fix has been proposed but not yet approved
  const { data: cases } = await supabase
    .from("governance_cases")
    .select(`*, datasets(name), genlayer_governance_verdicts(verdict, fix_assessment, dataset_action)`)
    .eq("user_id", user!.id)
    .not("proposed_fix", "is", null)
    .order("created_at", { ascending: false })

  const getVerdict = (raw: any) => Array.isArray(raw) ? raw[0] : raw
  const pendingFix = cases?.filter((c: any) => !getVerdict(c.genlayer_governance_verdicts)) ?? []
  const reviewed = cases?.filter((c: any) => !!getVerdict(c.genlayer_governance_verdicts)) ?? []

  return (
    <div style={{ padding: "28px 32px" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>Fix Reviews</h1>
          <p style={{ fontSize: 13, color: "var(--metadata-grey)", marginTop: 4 }}>
            Proposed fixes awaiting or completed GenLayer verdict
          </p>
        </div>
      </div>

      {pendingFix.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p className="text-section-title mb-4" style={{ color: "var(--control-ink)" }}>Pending Review</p>
          <div className="flex flex-col gap-3">
            {pendingFix.map((c: any) => (
              <div key={c.id} className="audit-panel" style={{ padding: 20 }}>
                <div className="flex items-start justify-between">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 999, background: "rgba(124,58,237,0.10)", color: "var(--consensus-violet)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {c.issue_type?.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--metadata-grey)" }}>{c.datasets?.name}</span>
                    </div>
                    <Link href={`/app/cases/${c.id}`} style={{ fontFamily: "var(--font-archivo)", fontSize: 15, fontWeight: 600, color: "var(--control-ink)", textDecoration: "none" }}>
                      {c.issue_type?.replace(/_/g, " ")}
                    </Link>
                    <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--frosted-panel)", borderRadius: 8, borderLeft: "3px solid var(--policy-amber)" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--policy-amber)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Proposed fix</p>
                      <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.6 }}>{c.proposed_fix}</p>
                    </div>
                  </div>
                  <Link href={`/app/cases/${c.id}`} className="btn-genlayer" style={{ marginLeft: 16, flexShrink: 0 }}>
                    Submit to GenLayer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <p className="text-section-title mb-4" style={{ color: "var(--control-ink)" }}>Reviewed by GenLayer</p>
          <div className="flex flex-col gap-3">
            {reviewed.map((c: any) => {
              const v = getVerdict(c.genlayer_governance_verdicts)
              return (
                <div key={c.id} className="audit-panel" style={{ padding: 20 }}>
                  <div className="flex items-start justify-between">
                    <div style={{ flex: 1 }}>
                      <Link href={`/app/cases/${c.id}`} style={{ fontFamily: "var(--font-archivo)", fontSize: 15, fontWeight: 600, color: "var(--control-ink)", textDecoration: "none" }}>
                        {c.title}
                      </Link>
                      <p style={{ fontSize: 13, color: "var(--metadata-grey)", marginTop: 2 }}>{c.datasets?.name}</p>
                      {v?.fix_assessment && (
                        <p style={{ fontSize: 13, color: "var(--control-ink)", marginTop: 8, lineHeight: 1.6 }}>
                          <strong>Fix assessment:</strong> {v.fix_assessment}
                        </p>
                      )}
                      {v?.dataset_action && (
                        <p style={{ fontSize: 13, color: "var(--control-ink)", marginTop: 4, lineHeight: 1.6 }}>
                          <strong>Action required:</strong> {v.dataset_action}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2" style={{ marginLeft: 16, flexShrink: 0 }}>
                      <span className={`verdict-badge verdict-${v?.verdict?.replace(/_/g, "-")}`}>
                        {v?.verdict?.replace(/_/g, " ")}
                      </span>
                      <Link href={`/app/consensus/${c.id}`} style={{ fontSize: 12, color: "var(--validation-cyan)" }}>
                        Consensus Chamber →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!cases?.length && (
        <div className="audit-panel" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)", marginBottom: 20 }}>
            No fix proposals found. Propose a fix when creating a governance case.
          </p>
          <Link href="/app/cases/new" className="btn-primary">Open case</Link>
        </div>
      )}
    </div>
  )
}
