import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"

export const metadata = { title: "Contract Activity" }

export default async function ContractTracePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user!.id).single()
  const isAdmin = profile?.role === "admin"

  // governance_cases has no "title" column  -  use issue_type
  const { data: logs } = isAdmin
    ? await createAdminClient()
        .from("contract_activity_logs")
        .select(`*, governance_cases(id, issue_type)`)
        .order("created_at", { ascending: false })
    : await supabase
        .from("contract_activity_logs")
        .select(`*, governance_cases(id, issue_type)`)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })

  const contractAddress =
    process.env.NEXT_PUBLIC_QUALORA_CONTRACT_ADDRESS ||
    process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS

  // Failed cases eligible for retry
  const { data: failedCases } = isAdmin
    ? await createAdminClient()
        .from("governance_cases")
        .select("id, issue_type, datasets(name)")
        .eq("status", "genlayer_failed")
        .order("created_at", { ascending: false })
    : await supabase
        .from("governance_cases")
        .select("id, issue_type, datasets(name)")
        .eq("status", "genlayer_failed")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })

  return (
    <div style={{ padding: "28px 32px" }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>Contract Activity</h1>
        <div className="source-of-truth-badge">
          <span className="status-dot" />
          StudioNet  -  Chain 61999
        </div>
      </div>

      {contractAddress && (
        <div className="audit-panel" style={{ padding: 20, marginBottom: 20 }}>
          <p className="text-badge-label mb-3" style={{ color: "var(--metadata-grey)" }}>DEPLOYED CONTRACT</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="hash-block" style={{ flex: 1 }}>{contractAddress}</span>
            <span style={{ fontSize: 12, color: "var(--governance-green)", fontWeight: 600 }}>QualoraDataQualityOracle</span>
          </div>
        </div>
      )}

      {/* Retry queue  -  failed cases */}
      {!!failedCases?.length && (
        <div className="audit-panel" style={{ marginBottom: 20, overflow: "hidden", borderColor: "rgba(220,38,38,0.25)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(220,38,38,0.15)", background: "rgba(220,38,38,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--quarantine-red)", fontFamily: "var(--font-archivo)" }}>
              Retry Queue  -  Failed Submissions
            </p>
            <span style={{ fontSize: 11, color: "var(--quarantine-red)" }}>{failedCases.length} case{failedCases.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ padding: "12px 20px" }}>
            <p style={{ fontSize: 12, color: "var(--metadata-grey)", marginBottom: 12, lineHeight: 1.5 }}>
              These cases failed during GenLayer submission. Open the case to retry with updated evidence or fix the proposal before resubmitting.
            </p>
            <div className="flex flex-col gap-2">
              {(failedCases as any[]).map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(220,38,38,0.04)", borderRadius: 8, border: "1px solid rgba(220,38,38,0.15)" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--quarantine-red)" }}>{c.issue_type?.replace(/_/g, " ")}</p>
                    <p style={{ fontSize: 11, color: "var(--metadata-grey)", marginTop: 2 }}>{c.datasets?.name} · {c.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <a href={`/app/cases/${c.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--quarantine-red)", textDecoration: "none", padding: "6px 12px", border: "1px solid rgba(220,38,38,0.30)", borderRadius: 6 }}>
                    Open to retry →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!logs?.length && (
        <div className="audit-panel" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)" }}>
            No contract transactions yet. Submit a governance case to see activity here.
          </p>
        </div>
      )}

      {!!logs?.length && (
        <div className="audit-panel" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Action", "Case", "Tx Hash", "Status", "Date"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--metadata-grey)", letterSpacing: "0.05em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--control-ink)", textTransform: "capitalize" }}>
                    {log.action?.replace(/_/g, " ") ?? " - "}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/app/cases/${log.governance_case_id}`} style={{ fontSize: 13, color: "var(--validation-cyan)", textDecoration: "none" }}>
                      {(log as any).governance_cases?.issue_type?.replace(/_/g, " ") ?? log.governance_case_id?.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {log.transaction_hash ? (
                      <a
                        href={`https://explorer-studio.genlayer.com/tx/${log.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, fontFamily: "var(--font-roboto-mono)", color: "var(--validation-cyan)", textDecoration: "none" }}
                        title={log.transaction_hash}
                      >
                        {log.transaction_hash.slice(0, 18)}…
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, fontFamily: "var(--font-roboto-mono)", color: "var(--metadata-grey)" }}> - </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                      background: log.status === "finalized" ? "rgba(5,150,105,0.10)" : log.status === "failed" ? "rgba(220,38,38,0.10)" : "rgba(124,58,237,0.10)",
                      color: log.status === "finalized" ? "var(--governance-green)" : log.status === "failed" ? "var(--quarantine-red)" : "var(--consensus-violet)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--metadata-grey)", fontFamily: "var(--font-roboto-mono)" }}>
                    {new Date(log.created_at).toLocaleDateString()}
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
