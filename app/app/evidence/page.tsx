import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export const metadata = { title: "Evidence Files" }

export default async function EvidencePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: files } = await supabase
    .from("evidence_files")
    .select(`*, governance_cases(title, datasets(name))`)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  return (
    <div style={{ padding: "28px 32px" }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>Evidence Files</h1>
      </div>

      {!files?.length && (
        <div className="audit-panel" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)" }}>
            No evidence files uploaded yet. Upload evidence when creating or editing a governance case.
          </p>
        </div>
      )}

      {!!files?.length && (
        <div className="audit-panel" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Filename", "Case", "Dataset", "Type", "Hash", "Uploaded"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--metadata-grey)", letterSpacing: "0.05em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map((f: any) => (
                <tr key={f.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/app/evidence/${f.id}`} style={{ fontSize: 13, color: "var(--validation-cyan)", textDecoration: "none" }}>
                      {f.original_filename ?? f.storage_path?.split("/").pop() ?? f.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--control-ink)" }}>
                    {f.governance_cases?.title ?? f.governance_case_id?.slice(0, 8) ?? "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--control-ink)" }}>
                    {f.governance_cases?.datasets?.name ?? "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--metadata-grey)", textTransform: "capitalize" }}>
                    {f.file_type ?? "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-roboto-mono)", color: "var(--metadata-grey)" }}>
                      {f.evidence_hash ? f.evidence_hash.slice(0, 16) + "…" : "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--metadata-grey)", fontFamily: "var(--font-roboto-mono)" }}>
                    {new Date(f.created_at).toLocaleDateString()}
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
