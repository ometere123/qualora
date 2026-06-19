import { createClient } from "@/lib/supabase/server"
import GovernanceGraph from "@/components/graph/GovernanceGraph"

export const metadata = { title: "Governance Graph" }

export default async function GraphPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: datasets }, { data: cases }] = await Promise.all([
    supabase.from("datasets").select("id, name, governance_status, business_criticality").eq("user_id", user!.id),
    supabase
      .from("governance_cases")
      .select(`id, issue_type, status, dataset_id, proposed_fix, evidence_files(id), genlayer_governance_verdicts(verdict)`)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  return (
    <div style={{ height: "calc(100vh - 76px)", display: "flex", flexDirection: "column" }}>
      {/* Page header */}
      <div
        style={{
          padding: "20px 28px 16px",
          borderBottom: "1px solid var(--schema-line)",
          background: "var(--audit-white)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 className="text-panel-title" style={{ color: "var(--control-ink)" }}>
            Governance Graph
          </h1>
          <p className="text-meta mt-1">
            Dataset pipeline · Issue nodes · Evidence blocks · GenLayer consensus
          </p>
        </div>
        <div className="source-of-truth-badge">
          <span className="status-dot" />
          GenLayer Intelligent Contract
        </div>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 overflow-hidden">
        <GovernanceGraph datasets={(datasets ?? []) as any} cases={(cases ?? []) as any} />
      </div>
    </div>
  )
}
