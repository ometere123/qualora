import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus, Database } from "lucide-react"

export const metadata = { title: "Dataset Registry" }

export default async function DatasetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: datasets } = await supabase
    .from("datasets")
    .select("id, name, domain, source_system, business_criticality, governance_status, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  const criticality: Record<string, string> = {
    critical: "verdict-rejected",
    high: "verdict-approved-warning",
    medium: "verdict-needs-evidence",
    low: "verdict-approved",
  }

  const govStatus: Record<string, string> = {
    active: "verdict-approved",
    quarantined: "verdict-quarantine",
    approved: "verdict-approved",
    review: "verdict-human-review",
  }

  return (
    <div style={{ padding: "28px 32px" }}>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>Dataset Registry</h1>
          <p className="text-meta mt-1">All registered datasets and their governance status</p>
        </div>
        <Link href="/app/datasets/new" className="btn-primary">
          <Plus size={14} /> Register dataset
        </Link>
      </div>

      {(!datasets || datasets.length === 0) ? (
        <div
          className="audit-panel"
          style={{ padding: 48, textAlign: "center", maxWidth: 480, margin: "60px auto" }}
        >
          <Database size={28} color="var(--dormant-slate)" style={{ margin: "0 auto 16px" }} />
          <h2 className="text-card-title mb-2">No datasets registered</h2>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)", marginBottom: 24 }}>
            Register your first dataset to begin creating governance cases.
          </p>
          <Link href="/app/datasets/new" className="btn-primary">Register first dataset</Link>
        </div>
      ) : (
        <div className="audit-panel" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--schema-line)", background: "var(--frosted-panel)" }}>
                {["Dataset name", "Domain", "Source system", "Criticality", "Status", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 20px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--metadata-grey)",
                      fontFamily: "var(--font-source-sans)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid var(--schema-line)" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)", fontFamily: "var(--font-source-sans)" }}>
                      {d.name}
                    </p>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--metadata-grey)" }}>{d.domain ?? " - "}</td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--metadata-grey)" }}>{d.source_system ?? " - "}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className={`verdict-badge ${criticality[d.business_criticality] ?? "verdict-needs-evidence"}`}>
                      {d.business_criticality}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className={`verdict-badge ${govStatus[d.governance_status] ?? "verdict-needs-evidence"}`}>
                      {d.governance_status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <Link href={`/app/datasets/${d.id}`} style={{ fontSize: 12, color: "var(--validation-cyan)" }}>
                      View
                    </Link>
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
