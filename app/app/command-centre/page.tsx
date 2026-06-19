import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { AlertTriangle, Database, Clock, ShieldCheck, Activity } from "lucide-react"

export const metadata = { title: "Command Centre" }

export default async function CommandCentrePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: openCases },
    { data: quarantined },
    { data: pendingConsensus },
    { data: recentVerdicts },
    { data: contractLogs },
  ] = await Promise.all([
    supabase.from("governance_cases").select("id, issue_type, status, created_at, datasets(name)")
      .eq("user_id", user!.id)
      .in("status", ["draft", "evidence_attached", "submitted_to_genlayer", "pending_consensus"])
      .order("created_at", { ascending: false }).limit(10),
    supabase.from("datasets").select("id, name, governance_status, business_criticality")
      .eq("user_id", user!.id).eq("governance_status", "quarantined"),
    supabase.from("governance_cases").select("id, issue_type, dataset_id, datasets(name)")
      .eq("user_id", user!.id).eq("status", "pending_consensus"),
    supabase.from("genlayer_governance_verdicts").select("id, verdict, severity, created_at, governance_case_id")
      .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("contract_activity_logs").select("id, action, status, created_at, error_message")
      .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(8),
  ])

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>
            Command Centre
          </h1>
          <p className="text-meta mt-1">
            Governance operations overview
          </p>
        </div>
        <Link href="/app/cases/new" className="btn-primary">
          New governance case
        </Link>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<AlertTriangle size={18} />} label="Open Cases" value={openCases?.length ?? 0} color="var(--control-ink)" href="/app/cases" />
        <StatCard icon={<Database size={18} />} label="Quarantined Datasets" value={quarantined?.length ?? 0} color="var(--quarantine-red)" href="/app/datasets" />
        <StatCard icon={<Clock size={18} />} label="Pending Consensus" value={pendingConsensus?.length ?? 0} color="var(--consensus-violet)" href="/app/cases" />
        <StatCard icon={<ShieldCheck size={18} />} label="Recent Verdicts" value={recentVerdicts?.length ?? 0} color="var(--governance-green)" href="/app/verdicts" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open cases */}
        <div className="audit-panel" style={{ padding: 0, overflow: "hidden" }}>
          <SectionHeader title="Open Cases" href="/app/cases" />
          {(openCases ?? []).length === 0 ? (
            <EmptyRow text="No open cases" />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {(openCases as any[]).map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: "1px solid var(--schema-line)" }}
                  >
                    <td style={{ padding: "12px 20px" }}>
                      <Link
                        href={`/app/cases/${c.id}`}
                        style={{ fontSize: 13, fontWeight: 600, color: "var(--control-ink)", fontFamily: "var(--font-source-sans)" }}
                      >
                        {c.issue_type.replace(/_/g, " ")}
                      </Link>
                      <p style={{ fontSize: 11, color: "var(--metadata-grey)", marginTop: 2, fontFamily: "var(--font-source-sans)" }}>
                        {c.datasets?.name ?? "Unknown dataset"}
                      </p>
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <span className={`verdict-badge ${statusClass(c.status)}`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent verdicts */}
        <div className="audit-panel" style={{ padding: 0, overflow: "hidden" }}>
          <SectionHeader title="Recent Verdicts" href="/app/verdicts" />
          {(recentVerdicts ?? []).length === 0 ? (
            <EmptyRow text="No verdicts yet — submit a case to GenLayer" />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {(recentVerdicts ?? []).map((v) => (
                  <tr key={v.id} style={{ borderBottom: "1px solid var(--schema-line)" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <Link
                        href={`/app/consensus/${v.governance_case_id}`}
                        style={{ fontSize: 13, fontWeight: 600, color: "var(--control-ink)" }}
                      >
                        <span className={`verdict-badge ${verdictClass(v.verdict)}`}>
                          {v.verdict.replace(/_/g, " ")}
                        </span>
                      </Link>
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: "var(--metadata-grey)" }}>
                        {v.severity} severity
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending consensus */}
        {(pendingConsensus ?? []).length > 0 && (
          <div
            className="audit-panel"
            style={{ padding: 0, overflow: "hidden", borderColor: "rgba(124,58,237,0.25)" }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(124,58,237,0.15)",
                background: "rgba(124,58,237,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--consensus-violet)", fontFamily: "var(--font-archivo)" }}>
                Pending GenLayer Consensus
              </p>
              <span className="animation-pulse-violet" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--consensus-violet)", display: "block" }} />
            </div>
            {(pendingConsensus as any[]).map((c) => (
              <div key={c.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--schema-line)" }}>
                <Link href={`/app/consensus/${c.id}`} style={{ fontSize: 13, color: "var(--control-ink)", fontWeight: 600 }}>
                  {c.issue_type.replace(/_/g, " ")}
                </Link>
                <p style={{ fontSize: 11, color: "var(--metadata-grey)", marginTop: 2 }}>
                  {c.datasets?.name}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Contract activity */}
        <div className="audit-panel" style={{ padding: 0, overflow: "hidden" }}>
          <SectionHeader title="Contract Activity" href="/app/contract-trace" icon={<Activity size={14} />} />
          {(contractLogs ?? []).length === 0 ? (
            <EmptyRow text="No contract activity yet" />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {(contractLogs ?? []).map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--schema-line)" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <p style={{ fontSize: 13, color: "var(--control-ink)", fontFamily: "var(--font-source-sans)", fontWeight: 500 }}>
                        {log.action}
                      </p>
                      {log.error_message && (
                        <p style={{ fontSize: 11, color: "var(--quarantine-red)", marginTop: 2 }}>{log.error_message}</p>
                      )}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <span
                        className={`verdict-badge ${log.status === "finalized" ? "verdict-approved" : log.status === "failed" ? "verdict-rejected" : "verdict-pending"}`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, href }: { icon: React.ReactNode; label: string; value: number; color: string; href: string }) {
  return (
    <Link href={href} className="audit-panel" style={{ padding: "20px", display: "block", textDecoration: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 12, color: "var(--metadata-grey)", fontFamily: "var(--font-source-sans)", fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <p style={{ fontFamily: "var(--font-archivo)", fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </p>
    </Link>
  )
}

function SectionHeader({ title, href, icon }: { title: string; href: string; icon?: React.ReactNode }) {
  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--schema-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)", fontFamily: "var(--font-archivo)", display: "flex", alignItems: "center", gap: 6 }}>
        {icon}{title}
      </p>
      <Link href={href} style={{ fontSize: 12, color: "var(--validation-cyan)" }}>View all</Link>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div style={{ padding: "24px 20px", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--metadata-grey)" }}>{text}</p>
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
