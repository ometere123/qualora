import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"

export const metadata = { title: "Verdict Detail" }

export default async function VerdictDetailPage({ params }: { params: Promise<{ verdictId: string }> }) {
  const { verdictId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: v } = await supabase
    .from("genlayer_governance_verdicts")
    .select(`*, governance_cases(title, issue_type, proposed_fix, datasets(name))`)
    .eq("id", verdictId)
    .eq("user_id", user!.id)
    .single()

  if (!v) notFound()

  const c = (v as any).governance_cases

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860 }}>
      <Link href="/app/verdicts" style={{ fontSize: 13, color: "var(--metadata-grey)" }}>← All Verdicts</Link>
      <div className="flex items-center justify-between mt-4 mb-6">
        <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>
          {c?.title ?? "Verdict"}
        </h1>
        <div className="source-of-truth-badge">
          <span className="status-dot" />
          GenLayer Contract
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="audit-panel" style={{ padding: 24 }}>
          <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>VERDICT</p>
          <div style={{ marginBottom: 16 }}>
            <span className={`verdict-badge verdict-${v.verdict?.replace(/_/g, "-")}`} style={{ fontSize: 14, padding: "8px 16px" }}>
              {v.verdict?.replace(/_/g, " ")}
            </span>
          </div>
          <Field label="Dataset action" value={v.dataset_action} />
          <Field label="Severity" value={v.severity} />
          <Field label="Confidence" value={v.confidence_label?.replace(/_/g, " ")} />
          <Field label="Selected outcome" value={v.selected_outcome} />
        </div>

        <div className="audit-panel" style={{ padding: 24 }}>
          <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>REASONING</p>
          <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.7, marginBottom: 16 }}>{v.reasoning_summary}</p>
          <Field label="Fix assessment" value={v.fix_assessment} />
          <Field label="Downstream risk" value={v.downstream_risk} />
        </div>
      </div>

      <div className="audit-panel" style={{ padding: 24, marginBottom: 20 }}>
        <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>CONTRACT TRACE</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <p className="text-meta mb-1">Contract address</p>
            <span className="hash-block">{v.contract_address}</span>
          </div>
          <div>
            <p className="text-meta mb-1">Transaction hash</p>
            <a
              href={`https://explorer-studio.genlayer.com/tx/${v.transaction_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hash-block"
              style={{ color: "var(--validation-cyan)", textDecoration: "none", display: "block" }}
              title={v.transaction_hash}
            >
              {v.transaction_hash}
            </a>
          </div>
          <div>
            <p className="text-meta mb-1">Evidence digest</p>
            <span className="hash-block">{v.evidence_digest ?? "—"}</span>
          </div>
          <div>
            <p className="text-meta mb-1">Finalized</p>
            <p style={{ fontSize: 12, fontFamily: "var(--font-roboto-mono)", color: "var(--control-ink)" }}>
              {v.consensus_timestamp ? new Date(v.consensus_timestamp).toUTCString() : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href={`/app/consensus/${v.governance_case_id}`} className="btn-genlayer">
          Open Consensus Chamber
        </Link>
        <Link href={`/app/cases/${v.governance_case_id}`} className="btn-secondary">
          View case
        </Link>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <p className="text-meta mb-1">{label}</p>
      <p style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.5 }}>{value}</p>
    </div>
  )
}
