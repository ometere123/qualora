import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"

export const metadata = { title: "Evidence File" }

export default async function EvidenceDetailPage({ params }: { params: Promise<{ evidenceId: string }> }) {
  const { evidenceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: f } = await supabase
    .from("evidence_files")
    .select(`*, governance_cases(id, issue_type, datasets(name))`)
    .eq("id", evidenceId)
    .eq("user_id", user!.id)
    .single()

  if (!f) notFound()

  const c = (f as any).governance_cases

  return (
    <div style={{ padding: "28px 32px", maxWidth: 740 }}>
      <Link href="/app/evidence" style={{ fontSize: 13, color: "var(--metadata-grey)" }}>← Evidence files</Link>
      <h1 className="text-page-title mt-4 mb-6" style={{ color: "var(--control-ink)" }}>
        {f.original_filename ?? "Evidence file"}
      </h1>

      <div className="audit-panel" style={{ padding: 24, marginBottom: 20 }}>
        <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>FILE DETAILS</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Case" value={c?.issue_type?.replace(/_/g, " ") ?? f.governance_case_id} />
          <Field label="Dataset" value={c?.datasets?.name ?? "—"} />
          <Field label="File type" value={f.file_type ?? "—"} />
          <Field label="Uploaded" value={new Date(f.created_at).toUTCString()} />
        </div>
      </div>

      <div className="audit-panel" style={{ padding: 24, marginBottom: 20 }}>
        <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>INTEGRITY HASH</p>
        <p style={{ fontSize: 13, color: "var(--metadata-grey)", marginBottom: 12, lineHeight: 1.6 }}>
          This SHA-256 hash of the file content was computed at upload time and included in the governance packet
          sent to the GenLayer contract. It cannot be modified.
        </p>
        <span className="hash-block" style={{ wordBreak: "break-all" }}>{f.evidence_hash}</span>
      </div>

      <div className="flex gap-3">
        {c?.id && (
          <Link href={`/app/cases/${c.id}`} className="btn-secondary">
            View case
          </Link>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-meta mb-1">{label}</p>
      <p style={{ fontSize: 13, color: "var(--control-ink)" }}>{value ?? "—"}</p>
    </div>
  )
}
