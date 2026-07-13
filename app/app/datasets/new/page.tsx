"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function NewDatasetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "", domain: "", owner_name: "", owner_team: "",
    source_system: "", refresh_cadence: "", downstream_consumers: "",
    business_criticality: "medium", schema_summary: "",
    expected_primary_key: "", quality_expectations: "",
    row_count_estimate: "",
  })

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/auth/login"); return }

    const { data: ws } = await supabase
      .from("workspaces").select("id").eq("user_id", user.id).limit(1).single()

    if (!ws) {
      setError("Please complete onboarding first.")
      setLoading(false)
      return
    }

    const payload = {
      name: form.name,
      domain: form.domain || null,
      owner_name: form.owner_name || null,
      owner_team: form.owner_team || null,
      source_system: form.source_system || null,
      refresh_cadence: form.refresh_cadence || null,
      downstream_consumers: form.downstream_consumers || null,
      business_criticality: form.business_criticality,
      schema_summary: form.schema_summary || null,
      expected_primary_key: form.expected_primary_key || null,
      quality_expectations: form.quality_expectations || null,
      row_count_estimate: form.row_count_estimate ? parseInt(form.row_count_estimate, 10) : null,
      user_id: user.id,
      workspace_id: ws.id,
    }

    const { data, error: insertError } = await supabase
      .from("datasets")
      .insert(payload)
      .select("id")
      .single()

    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push(`/app/datasets/${data.id}`)
  }

  return (
    <div style={{ padding: "28px 32px calc(140px + env(safe-area-inset-bottom))", maxWidth: 680 }}>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/app/datasets" style={{ fontSize: 13, color: "var(--metadata-grey)" }}>
          ← Datasets
        </Link>
        <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>Register dataset</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Identity */}
        <div className="audit-panel" style={{ padding: 28 }}>
          <h2 className="text-panel-title mb-6">Dataset identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Dataset name *</label>
              <input required className="form-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="revenue_events_q2" />
            </div>
            <div>
              <label className="form-label">Domain</label>
              <input className="form-input" value={form.domain} onChange={(e) => set("domain", e.target.value)} placeholder="finance, product, marketing…" />
            </div>
            <div>
              <label className="form-label">Owner name</label>
              <input className="form-input" value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} placeholder="Jordan Chen" />
            </div>
            <div>
              <label className="form-label">Owner team</label>
              <input className="form-input" value={form.owner_team} onChange={(e) => set("owner_team", e.target.value)} placeholder="Analytics Engineering" />
            </div>
            <div>
              <label className="form-label">Source system</label>
              <input className="form-input" value={form.source_system} onChange={(e) => set("source_system", e.target.value)} placeholder="Salesforce, Stripe, Snowflake…" />
            </div>
            <div>
              <label className="form-label">Row count estimate</label>
              <input
                type="number"
                className="form-input"
                value={form.row_count_estimate}
                onChange={(e) => set("row_count_estimate", e.target.value)}
                placeholder="2400000"
              />
            </div>
            <div>
              <label className="form-label">Refresh cadence</label>
              <select className="form-select" value={form.refresh_cadence} onChange={(e) => set("refresh_cadence", e.target.value)}>
                <option value="">Select…</option>
                <option>Real-time</option>
                <option>Hourly</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Ad hoc</option>
              </select>
            </div>
            <div>
              <label className="form-label">Business criticality</label>
              <select className="form-select" value={form.business_criticality} onChange={(e) => set("business_criticality", e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="mt-5">
            <label className="form-label">Downstream consumers</label>
            <input className="form-input" value={form.downstream_consumers} onChange={(e) => set("downstream_consumers", e.target.value)} placeholder="Executive revenue dashboard, ML pipeline, finance reporting…" />
          </div>
        </div>

        {/* Schema */}
        <div className="audit-panel" style={{ padding: 28 }}>
          <h2 className="text-panel-title mb-6">Schema &amp; quality context</h2>
          <div className="flex flex-col gap-5">
            <div>
              <label className="form-label">Expected primary key</label>
              <input className="form-input" value={form.expected_primary_key} onChange={(e) => set("expected_primary_key", e.target.value)} placeholder="transaction_id, user_id + event_timestamp…" />
            </div>
            <div>
              <label className="form-label">Schema summary</label>
              <textarea className="form-textarea" rows={4} value={form.schema_summary} onChange={(e) => set("schema_summary", e.target.value)} placeholder="Describe the key columns, data types, and relationships…" />
            </div>
            <div>
              <label className="form-label">Quality expectations</label>
              <textarea className="form-textarea" rows={3} value={form.quality_expectations} onChange={(e) => set("quality_expectations", e.target.value)} placeholder="No more than 2% null in user_id. Revenue should always be in USD cents…" />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.22)", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "var(--quarantine-red)" }}>
            {error}
          </div>
        )}

        <div
          className="flex gap-3"
          style={{
            position: "sticky",
            bottom: "calc(92px + env(safe-area-inset-bottom))",
            zIndex: 5,
            padding: "14px 0 4px",
            background: "linear-gradient(180deg, rgba(243,246,250,0), var(--ledger-mist) 34%)",
          }}
        >
          <Link href="/app/datasets" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Registering…" : "Register dataset"}
          </button>
        </div>
      </form>
    </div>
  )
}
