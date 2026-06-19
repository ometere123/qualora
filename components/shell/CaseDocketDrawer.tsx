"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  caseId: string
  onClose: () => void
}

interface CaseData {
  id: string
  issue_type: string
  status: string
  affected_columns: string | null
  downstream_impact: string | null
  proposed_fix: string | null
  analyst_notes: string | null
  datasets: { name: string } | null
  genlayer_governance_verdicts: { verdict: string; severity: string } | null
}

export default function CaseDocketDrawer({ caseId, onClose }: Props) {
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("governance_cases")
      .select(`
        id, issue_type, status, affected_columns,
        downstream_impact, proposed_fix, analyst_notes,
        datasets(name),
        genlayer_governance_verdicts(verdict, severity)
      `)
      .eq("id", caseId)
      .single()
      .then(({ data }) => {
        setCaseData(data as unknown as CaseData)
        setLoading(false)
      })
  }, [caseId])

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, background: "rgba(10,16,32,0.4)",
          zIndex: 200, backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed", right: 0, top: 0, bottom: 0,
          width: 460,
          background: "var(--audit-white)",
          borderLeft: "1px solid var(--schema-line)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          animation: "slide-in-right 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--schema-line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p className="text-badge-label" style={{ color: "var(--metadata-grey)" }}>
              CASE DOCKET
            </p>
            <p
              style={{
                fontFamily: "var(--font-roboto-mono)",
                fontSize: 12,
                color: "var(--control-ink)",
                marginTop: 2,
              }}
            >
              {caseId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 6, background: "var(--frosted-panel)",
              border: "1px solid var(--schema-line)", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={14} color="var(--metadata-grey)" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto" style={{ padding: "20px 24px" }}>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[80, 60, 120, 80, 100].map((w, i) => (
                <div key={i} className="skeleton" style={{ height: 16, width: `${w}%` }} />
              ))}
            </div>
          ) : caseData ? (
            <div className="flex flex-col gap-5">
              <Field label="Dataset" value={caseData.datasets?.name ?? "—"} />
              <Field label="Issue type" value={caseData.issue_type} />
              <Field label="Affected columns" value={caseData.affected_columns ?? "—"} />
              <Field label="Downstream impact" value={caseData.downstream_impact ?? "—"} />
              <Field label="Proposed fix" value={caseData.proposed_fix ?? "—"} />

              {/* Status */}
              <div>
                <p className="form-label">Status</p>
                <span className={`verdict-badge ${statusClass(caseData.status)}`}>
                  {caseData.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Verdict */}
              {caseData.genlayer_governance_verdicts && (
                <div
                  style={{
                    background: "rgba(124,58,237,0.06)",
                    border: "1px solid rgba(124,58,237,0.18)",
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <p className="text-badge-label mb-2" style={{ color: "var(--consensus-violet)" }}>
                    GENLAYER VERDICT
                  </p>
                  <span className={`verdict-badge ${verdictClass(caseData.genlayer_governance_verdicts.verdict)}`}>
                    {caseData.genlayer_governance_verdicts.verdict.replace(/_/g, " ")}
                  </span>
                  <p style={{ fontSize: 12, color: "var(--metadata-grey)", marginTop: 8 }}>
                    Severity: {caseData.genlayer_governance_verdicts.severity}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: "var(--metadata-grey)", fontSize: 14 }}>Case not found.</p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--schema-line)",
            display: "flex",
            gap: 10,
          }}
        >
          <Link href={`/app/cases/${caseId}`} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
            Open full case <ExternalLink size={13} />
          </Link>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="form-label">{label}</p>
      <p style={{ fontSize: 14, color: "var(--control-ink)", lineHeight: 1.5 }}>{value}</p>
    </div>
  )
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    draft: "verdict-needs-evidence",
    evidence_attached: "verdict-needs-evidence",
    submitted_to_genlayer: "verdict-pending",
    pending_consensus: "verdict-pending",
    verdict_received: "verdict-approved",
    closed: "verdict-approved",
  }
  return map[status] ?? "verdict-needs-evidence"
}

function verdictClass(verdict: string): string {
  const map: Record<string, string> = {
    approved: "verdict-approved",
    approved_with_warning: "verdict-approved-warning",
    quarantine_dataset: "verdict-quarantine",
    reject_proposed_fix: "verdict-rejected",
    requires_human_review: "verdict-human-review",
    needs_more_evidence: "verdict-needs-evidence",
  }
  return map[verdict] ?? "verdict-needs-evidence"
}
