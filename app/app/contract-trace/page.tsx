import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export const metadata = { title: "Contract Activity" }

export default async function ContractTracePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: logs } = await supabase
    .from("contract_activity_logs")
    .select(`*, governance_cases(title)`)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  const contractAddress =
    process.env.NEXT_PUBLIC_QUALORA_CONTRACT_ADDRESS ||
    process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS

  return (
    <div style={{ padding: "28px 32px" }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>Contract Activity</h1>
        <div className="source-of-truth-badge">
          <span className="status-dot" />
          StudioNet — Chain 61999
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
                    {log.action?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/app/cases/${log.governance_case_id}`} style={{ fontSize: 13, color: "var(--validation-cyan)", textDecoration: "none" }}>
                      {(log as any).governance_cases?.title ?? log.governance_case_id?.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-roboto-mono)", color: "var(--metadata-grey)" }}>
                      {log.transaction_hash ? log.transaction_hash.slice(0, 18) + "…" : "—"}
                    </span>
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
