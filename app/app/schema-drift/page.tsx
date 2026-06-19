import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export const metadata = { title: "Schema Drift" }

export default async function SchemaDriftPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cases } = await supabase
    .from("governance_cases")
    .select(`*, datasets(name), genlayer_governance_verdicts(verdict, severity)`)
    .eq("user_id", user!.id)
    .eq("issue_type", "schema_drift")
    .order("created_at", { ascending: false })

  return (
    <div style={{ padding: "28px 32px" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>Schema Drift</h1>
          <p style={{ fontSize: 13, color: "var(--metadata-grey)", marginTop: 4 }}>
            Governance cases classified as schema_drift — column additions, removals, type changes
          </p>
        </div>
        <Link href="/app/cases/new?issue_type=schema_drift" className="btn-primary">New schema drift case</Link>
      </div>

      {!cases?.length && (
        <div className="audit-panel" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)", marginBottom: 20 }}>
            No schema drift cases found. Create one when a dataset schema has changed unexpectedly.
          </p>
          <Link href="/app/cases/new" className="btn-primary">Open case</Link>
        </div>
      )}

      {!!cases?.length && (
        <div className="flex flex-col gap-3">
          {cases.map((c: any) => {
            const verdict = c.genlayer_governance_verdicts
            return (
              <div key={c.id} className="audit-panel" style={{ padding: 20 }}>
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/app/cases/${c.id}`} style={{ fontFamily: "var(--font-archivo)", fontSize: 15, fontWeight: 600, color: "var(--control-ink)", textDecoration: "none" }}>
                      {c.title}
                    </Link>
                    <p style={{ fontSize: 13, color: "var(--metadata-grey)", marginTop: 4 }}>
                      {c.datasets?.name} · {c.affected_columns ?? "affected columns not specified"}
                    </p>
                    {c.schema_drift_summary && (
                      <p style={{ fontSize: 13, color: "var(--control-ink)", marginTop: 8, lineHeight: 1.6 }}>
                        {c.schema_drift_summary}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2" style={{ flexShrink: 0, marginLeft: 16 }}>
                    {verdict ? (
                      <span className={`verdict-badge verdict-${verdict.verdict?.replace(/_/g, "-")}`}>
                        {verdict.verdict?.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "rgba(124,58,237,0.10)", color: "var(--consensus-violet)", textTransform: "uppercase" }}>
                        {c.status?.replace(/_/g, " ")}
                      </span>
                    )}
                    <p style={{ fontSize: 11, color: "var(--metadata-grey)" }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
