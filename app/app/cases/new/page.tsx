"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Upload, Database, Globe, Link2, Snowflake, AlertCircle, CheckCircle2 } from "lucide-react"

const STEPS = [
  "Data Source",
  "Select Dataset",
  "Classify Issue",
  "Downstream & Fix",
  "Candidate Outcomes",
  "Review & Submit",
]

const ISSUE_TYPES = [
  "missingness", "duplication", "schema_drift",
  "freshness_failure", "invalid_values", "mixed",
]

type SourceType = "file_upload" | "supabase_connection" | "postgres_connection" | "api_connection" | "bigquery_connection" | "snowflake_connection" | "existing"

interface ProfileSummary {
  row_count: number
  column_count: number
  missingness: Record<string, number>
  duplication: { duplicate_row_pct: number }
  profile_hash: string
  schema_snapshot_hash: string
  evidence_manifest_hash: string
  raw_sample_hash: string
}

function NewCaseInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillDatasetId = searchParams.get("datasetId")
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [datasets, setDatasets] = useState<{ id: string; name: string }[]>([])

  // Data source step
  const [sourceType, setSourceType] = useState<SourceType | null>(prefillDatasetId ? "existing" : null)
  const [dataSourceId, setDataSourceId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [sourceLabel, setSourceLabel] = useState<string>("")
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle")

  // Connector form state
  const [connectorForm, setConnectorForm] = useState<Record<string, string>>({})
  function setConn(k: string, v: string) { setConnectorForm((p) => ({ ...p, [k]: v })) }

  // Case form
  const [form, setForm] = useState({
    dataset_id: prefillDatasetId ?? "",
    issue_type: "",
    affected_columns: "",
    missingness_summary: "",
    duplication_summary: "",
    schema_drift_summary: "",
    freshness_summary: "",
    invalid_values_summary: "",
    historical_baseline_summary: "",
    downstream_impact: "",
    proposed_fix: "",
    analyst_notes: "",
    candidate_outcome_a: "",
    candidate_outcome_b: "",
    candidate_outcome_c: "",
  })
  function set(field: string, value: string) { setForm((p) => ({ ...p, [field]: value })) }
  const wizardStorageKey = "qualora.caseWizard.v1"

  useEffect(() => {
    const supabase = createClient()
    supabase.from("datasets").select("id, name").then(({ data }) => setDatasets(data ?? []))
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(wizardStorageKey)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (typeof saved.step === "number") setStep(saved.step)
      if (saved.sourceType) setSourceType(saved.sourceType)
      if (saved.dataSourceId) setDataSourceId(saved.dataSourceId)
      if (saved.profileId) setProfileId(saved.profileId)
      if (saved.profile) setProfile(saved.profile)
      if (saved.sourceLabel) setSourceLabel(saved.sourceLabel)
      if (saved.form) setForm((prev) => ({ ...prev, ...saved.form }))
    } catch {
      window.localStorage.removeItem(wizardStorageKey)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    window.localStorage.setItem(wizardStorageKey, JSON.stringify({
      step,
      sourceType,
      dataSourceId,
      profileId,
      profile,
      sourceLabel,
      form,
    }))
  }, [step, sourceType, dataSourceId, profileId, profile, sourceLabel, form])

  // Auto-populate issue summaries from profile
  useEffect(() => {
    if (!profile) return
    const miss = Object.entries(profile.missingness)
    if (miss.length > 0 && !form.missingness_summary) {
      const lines = miss.map(([col, pct]) => `${col}: ${(pct * 100).toFixed(1)}% null`)
      set("missingness_summary", lines.join(". "))
    }
    const dupPct = (profile.duplication.duplicate_row_pct * 100).toFixed(2)
    if (profile.duplication.duplicate_row_pct > 0 && !form.duplication_summary) {
      set("duplication_summary", `${dupPct}% of rows are exact duplicates.`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadStatus("uploading")
    setError(null)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/datasources/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setDataSourceId(json.data_source_id)
      setProfileId(json.profile_id)
      setProfile(json.profile)
      setSourceLabel(json.source_label)
      setUploadStatus("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setUploadStatus("error")
    }
  }

  async function handleConnect() {
    if (!sourceType || sourceType === "existing") return
    setConnecting(true)
    setError(null)
    try {
      let config: Record<string, unknown> = {}
      let credentials: Record<string, unknown> = {}

      if (sourceType === "supabase_connection") {
        config = { project_url: connectorForm.project_url, table_name: connectorForm.table_name, row_limit: 10000 }
        credentials = { anon_key: connectorForm.anon_key }
      } else if (sourceType === "postgres_connection") {
        const host = connectorForm.host ?? ""
        const autoSsl = host.includes("supabase.co") || host.includes("supabase.com") || connectorForm.ssl === "true"
        config = {
          host, port: parseInt(connectorForm.port || "5432"),
          database: connectorForm.database, username: connectorForm.username,
          ssl: autoSsl, table_name: connectorForm.table_name,
        }
        credentials = { password: connectorForm.password }
      } else if (sourceType === "api_connection") {
        config = { endpoint_url: connectorForm.endpoint_url, method: connectorForm.method || "GET", json_path: connectorForm.json_path }
        credentials = connectorForm.api_key ? { headers: { Authorization: `Bearer ${connectorForm.api_key}` } } : {}
      } else if (sourceType === "bigquery_connection") {
        config = { project_id: connectorForm.project_id, dataset_id: connectorForm.dataset_id, table_id: connectorForm.table_id }
        credentials = { service_account_json: connectorForm.service_account_json }
      } else if (sourceType === "snowflake_connection") {
        config = {
          account: connectorForm.account, warehouse: connectorForm.warehouse,
          database: connectorForm.database, schema_name: connectorForm.schema_name,
          table_name: connectorForm.table_name,
        }
        credentials = { username: connectorForm.username, password: connectorForm.password }
      }

      const res = await fetch("/api/datasources/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: sourceType, name: connectorForm.name || sourceType, config, credentials }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setDataSourceId(json.data_source_id)
      setProfileId(json.profile_id)
      setProfile(json.profile)
      setSourceLabel(json.source_label)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed")
    } finally {
      setConnecting(false)
    }
  }

  async function handleSubmit() {
    setError(null)
    if (!form.downstream_impact.trim()) {
      setError("downstream_impact is required. Describe who or what depends on this dataset.")
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/auth/login"); return }

    const { data: ws } = await supabase.from("workspaces").select("id").eq("user_id", user.id).limit(1).single()
    if (!ws) { setError("No workspace found."); setLoading(false); return }

    const payload: Record<string, unknown> = {
      ...form,
      user_id: user.id,
      workspace_id: ws.id,
      status: "draft",
    }
    if (dataSourceId) payload.data_source_id = dataSourceId
    if (profileId) payload.profile_id = profileId
    if (profile) {
      payload.schema_snapshot_hash = profile.schema_snapshot_hash
      payload.evidence_manifest_hash = profile.evidence_manifest_hash
    }

    const { data, error: insertError } = await supabase
      .from("governance_cases")
      .insert(payload)
      .select("id")
      .single()

    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push(`/app/cases/${data.id}`)
  }

  const selectedDataset = datasets.find((d) => d.id === form.dataset_id)
  const canProceedFromSource = sourceType === "existing"
    ? true
    : (sourceType === "file_upload" ? uploadStatus === "done" : !!dataSourceId)
  const hasRequiredHashes = Boolean(profile?.raw_sample_hash && profile.schema_snapshot_hash && profile.evidence_manifest_hash && profile.profile_hash)
  const canSubmit = Boolean(form.dataset_id && form.issue_type && form.downstream_impact.trim() && form.proposed_fix.trim() && hasRequiredHashes)

  return (
    <div style={{ padding: "28px 32px", maxWidth: 760 }}>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/app/cases" style={{ fontSize: 13, color: "var(--metadata-grey)" }}>← Cases</Link>
        <h1 className="text-page-title" style={{ color: "var(--control-ink)" }}>New governance case</h1>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => i < step && setStep(i)}
              className={`step-circle ${i === step ? "step-active" : i < step ? "step-done" : "step-inactive"}`}
              style={{ cursor: i < step ? "pointer" : "default" }}
            >
              {i < step ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : i + 1}
            </button>
            <span style={{ fontSize: 12, color: i === step ? "var(--control-ink)" : "var(--dormant-slate)", fontWeight: i === step ? 600 : 400, whiteSpace: "nowrap" }}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div style={{ width: 20, height: 1, background: "var(--schema-line)", flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      {/* ── Step 0: Data Source ── */}
      {step === 0 && (
        <div className="flex flex-col gap-5">
          <div className="audit-panel" style={{ padding: 28 }}>
            <h2 className="text-panel-title mb-2">Choose your data source</h2>
            <p className="text-meta mb-6">
              Upload a file or connect directly to your database. Either way, Qualora profiles the data and sends only a structured summary to GenLayer — the full dataset never leaves your environment.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {[
                { type: "existing" as SourceType, icon: <Database size={18} />, label: "Existing dataset", sub: "Already registered" },
                { type: "file_upload" as SourceType, icon: <Upload size={18} />, label: "Upload file", sub: "CSV, Excel, JSON" },
                { type: "supabase_connection" as SourceType, icon: <Database size={18} />, label: "Supabase", sub: "Connect table" },
                { type: "postgres_connection" as SourceType, icon: <Database size={18} />, label: "PostgreSQL", sub: "Direct connection" },
                { type: "api_connection" as SourceType, icon: <Globe size={18} />, label: "API endpoint", sub: "GET / POST" },
                { type: "bigquery_connection" as SourceType, icon: <Link2 size={18} />, label: "BigQuery", sub: "GCP project" },
                { type: "snowflake_connection" as SourceType, icon: <Snowflake size={18} />, label: "Snowflake", sub: "Data warehouse" },
              ].map(({ type, icon, label, sub }) => (
                <button
                  key={type}
                  onClick={() => { setSourceType(type); setError(null); setDataSourceId(null); setProfile(null); setUploadStatus("idle") }}
                  style={{
                    padding: "16px 14px", borderRadius: 10, textAlign: "left",
                    border: sourceType === type ? "2px solid var(--validation-cyan)" : "1px solid var(--schema-line)",
                    background: sourceType === type ? "rgba(6,182,212,0.05)" : "var(--audit-white)",
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 6,
                  }}
                >
                  <span style={{ color: sourceType === type ? "var(--validation-cyan)" : "var(--metadata-grey)" }}>{icon}</span>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--control-ink)" }}>{label}</p>
                  <p style={{ fontSize: 11, color: "var(--metadata-grey)" }}>{sub}</p>
                </button>
              ))}
            </div>

            {/* Source-specific form */}
            {sourceType === "file_upload" && (
              <div>
                <input ref={fileRef} type="file" accept=".csv,.json,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                {uploadStatus === "idle" || uploadStatus === "error" ? (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: "100%", padding: "28px 20px", borderRadius: 10, cursor: "pointer",
                      border: "2px dashed var(--schema-line)", background: "var(--frosted-panel)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    }}
                  >
                    <Upload size={22} color="var(--dormant-slate)" />
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)" }}>Click to select file</p>
                    <p style={{ fontSize: 12, color: "var(--metadata-grey)" }}>CSV, JSON, Excel, exported reports, schema snapshots</p>
                  </button>
                ) : uploadStatus === "uploading" ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--metadata-grey)", fontSize: 14 }}>
                    Uploading and profiling…
                  </div>
                ) : (
                  <ProfileCard profile={profile!} label={sourceLabel} />
                )}
              </div>
            )}

            {sourceType === "supabase_connection" && (
              <ConnectorForm
                fields={[
                  { key: "project_url", label: "Project URL", placeholder: "https://xxxx.supabase.co" },
                  { key: "anon_key", label: "Anon / Service key", placeholder: "eyJ…", secret: true },
                  { key: "table_name", label: "Table name", placeholder: "orders" },
                  { key: "name", label: "Source name (optional)", placeholder: "Production orders table" },
                ]}
                values={connectorForm} onChange={setConn}
                onConnect={handleConnect} connecting={connecting}
                connected={!!dataSourceId} profile={profile} sourceLabel={sourceLabel}
              />
            )}

            {sourceType === "postgres_connection" && (
              <ConnectorForm
                fields={[
                  { key: "host", label: "Host", placeholder: "db.example.com" },
                  { key: "port", label: "Port", placeholder: "5432" },
                  { key: "database", label: "Database", placeholder: "analytics" },
                  { key: "username", label: "Username", placeholder: "readonly_user" },
                  { key: "password", label: "Password", placeholder: "••••••••", secret: true },
                  { key: "table_name", label: "Table / schema.table", placeholder: "public.orders" },
                  { key: "name", label: "Source name (optional)", placeholder: "Production DB orders" },
                ]}
                values={connectorForm} onChange={setConn}
                onConnect={handleConnect} connecting={connecting}
                connected={!!dataSourceId} profile={profile} sourceLabel={sourceLabel}
              />
            )}

            {sourceType === "api_connection" && (
              <ConnectorForm
                fields={[
                  { key: "endpoint_url", label: "Endpoint URL", placeholder: "https://api.example.com/data" },
                  { key: "method", label: "Method", placeholder: "GET" },
                  { key: "json_path", label: "JSON path to array (optional)", placeholder: "data.items" },
                  { key: "api_key", label: "API key (optional)", placeholder: "Bearer token or key", secret: true },
                  { key: "name", label: "Source name (optional)", placeholder: "Orders API" },
                ]}
                values={connectorForm} onChange={setConn}
                onConnect={handleConnect} connecting={connecting}
                connected={!!dataSourceId} profile={profile} sourceLabel={sourceLabel}
              />
            )}

            {sourceType === "bigquery_connection" && (
              <ConnectorForm
                fields={[
                  { key: "project_id", label: "GCP Project ID", placeholder: "my-project-123" },
                  { key: "dataset_id", label: "Dataset ID", placeholder: "analytics" },
                  { key: "table_id", label: "Table ID", placeholder: "orders" },
                  { key: "service_account_json", label: "Service account JSON", placeholder: '{"type": "service_account", …}', secret: true, textarea: true },
                  { key: "name", label: "Source name (optional)", placeholder: "BQ orders table" },
                ]}
                values={connectorForm} onChange={setConn}
                onConnect={handleConnect} connecting={connecting}
                connected={!!dataSourceId} profile={profile} sourceLabel={sourceLabel}
              />
            )}

            {sourceType === "snowflake_connection" && (
              <ConnectorForm
                fields={[
                  { key: "account", label: "Account identifier", placeholder: "xy12345.us-east-1" },
                  { key: "warehouse", label: "Warehouse", placeholder: "COMPUTE_WH" },
                  { key: "database", label: "Database", placeholder: "ANALYTICS" },
                  { key: "schema_name", label: "Schema", placeholder: "PUBLIC" },
                  { key: "table_name", label: "Table", placeholder: "ORDERS" },
                  { key: "username", label: "Username", placeholder: "readonly_user" },
                  { key: "password", label: "Password", placeholder: "••••••••", secret: true },
                  { key: "name", label: "Source name (optional)", placeholder: "Snowflake orders" },
                ]}
                values={connectorForm} onChange={setConn}
                onConnect={handleConnect} connecting={connecting}
                connected={!!dataSourceId} profile={profile} sourceLabel={sourceLabel}
              />
            )}
          </div>

          {error && <ErrorBanner message={error} />}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setStep(1)}
              disabled={!canProceedFromSource}
              className="btn-primary"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Select Dataset ── */}
      {step === 1 && (
        <div className="audit-panel" style={{ padding: 28 }}>
          <h2 className="text-panel-title mb-2">Which dataset has a quality issue?</h2>
          {sourceType !== "existing" && profile && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, fontSize: 13, color: "var(--metadata-grey)" }}>
              Source: <strong style={{ color: "var(--control-ink)" }}>{sourceLabel}</strong> — {profile.row_count.toLocaleString()} rows, {profile.column_count} columns profiled
            </div>
          )}
          <p className="text-meta mb-5">Link this case to a registered dataset for audit trail and graph visibility.</p>
          {datasets.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--metadata-grey)", marginBottom: 16 }}>No datasets registered yet.</p>
              <Link href="/app/datasets/new" className="btn-primary">Register a dataset first</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {datasets.map((d) => (
                <button
                  key={d.id}
                  onClick={() => set("dataset_id", d.id)}
                  style={{
                    padding: "14px 18px", borderRadius: 8, textAlign: "left",
                    border: form.dataset_id === d.id ? "2px solid var(--validation-cyan)" : "1px solid var(--schema-line)",
                    background: form.dataset_id === d.id ? "rgba(6,182,212,0.05)" : "var(--audit-white)",
                    cursor: "pointer",
                  }}
                >
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)" }}>{d.name}</p>
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(0)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(2)} disabled={!form.dataset_id} className="btn-primary">Continue</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Classify Issue ── */}
      {step === 2 && (
        <div className="audit-panel" style={{ padding: 28 }}>
          <h2 className="text-panel-title mb-2">Classify the issue</h2>
          <p className="text-meta mb-6">Dataset: <strong style={{ color: "var(--control-ink)" }}>{selectedDataset?.name}</strong></p>

          {profile && (profile.duplication.duplicate_row_pct > 0 || Object.keys(profile.missingness).length > 0) && (
            <div style={{ marginBottom: 20, padding: "14px 16px", background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--policy-amber)", letterSpacing: "0.06em", marginBottom: 8 }}>ISSUES DETECTED BY PROFILER</p>
              {Object.keys(profile.missingness).length > 0 && (
                <p style={{ fontSize: 13, color: "var(--control-ink)", marginBottom: 4 }}>
                  Missingness: {Object.entries(profile.missingness).map(([c, p]) => `${c} (${(p * 100).toFixed(1)}%)`).join(", ")}
                </p>
              )}
              {profile.duplication.duplicate_row_pct > 0 && (
                <p style={{ fontSize: 13, color: "var(--control-ink)" }}>
                  Duplicates: {(profile.duplication.duplicate_row_pct * 100).toFixed(2)}% of rows
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-5">
            <div>
              <label className="form-label">Issue type *</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                {ISSUE_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => set("issue_type", t)}
                    style={{
                      padding: "10px 14px", borderRadius: 6, textAlign: "center",
                      border: form.issue_type === t ? "2px solid var(--governance-navy)" : "1px solid var(--schema-line)",
                      background: form.issue_type === t ? "var(--governance-navy)" : "var(--audit-white)",
                      color: form.issue_type === t ? "white" : "var(--control-ink)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {t.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Affected columns</label>
              <input className="form-input" value={form.affected_columns} onChange={(e) => set("affected_columns", e.target.value)} placeholder="customer_region, transaction_id, revenue_usd…" />
            </div>
            {(form.issue_type === "missingness" || form.issue_type === "mixed") && (
              <div>
                <label className="form-label">Missingness summary</label>
                <textarea className="form-textarea" rows={3} value={form.missingness_summary} onChange={(e) => set("missingness_summary", e.target.value)} placeholder="8% of customer_region values are NULL…" />
              </div>
            )}
            {(form.issue_type === "duplication" || form.issue_type === "mixed") && (
              <div>
                <label className="form-label">Duplication summary</label>
                <textarea className="form-textarea" rows={3} value={form.duplication_summary} onChange={(e) => set("duplication_summary", e.target.value)} placeholder="3.2% of transaction_id values appear more than once…" />
              </div>
            )}
            {(form.issue_type === "schema_drift" || form.issue_type === "mixed") && (
              <div>
                <label className="form-label">Schema drift summary</label>
                <textarea className="form-textarea" rows={3} value={form.schema_drift_summary} onChange={(e) => set("schema_drift_summary", e.target.value)} placeholder="Revenue column changed from dollars to cents…" />
              </div>
            )}
            {form.issue_type === "freshness_failure" && (
              <div>
                <label className="form-label">Freshness summary</label>
                <textarea className="form-textarea" rows={3} value={form.freshness_summary} onChange={(e) => set("freshness_summary", e.target.value)} placeholder="Last updated 48 hours ago. Expected daily…" />
              </div>
            )}
            {form.issue_type === "invalid_values" && (
              <div>
                <label className="form-label">Invalid values summary</label>
                <textarea className="form-textarea" rows={3} value={form.invalid_values_summary} onChange={(e) => set("invalid_values_summary", e.target.value)} placeholder="Negative revenue values in 0.4% of rows…" />
              </div>
            )}
            <div>
              <label className="form-label">Historical baseline summary</label>
              <textarea className="form-textarea" rows={3} value={form.historical_baseline_summary} onChange={(e) => set("historical_baseline_summary", e.target.value)} placeholder="Prior 3 months had less than 1% missingness…" />
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(3)} disabled={!form.issue_type} className="btn-primary">Continue</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Downstream & Fix ── */}
      {step === 3 && (
        <div className="audit-panel" style={{ padding: 28 }}>
          <h2 className="text-panel-title mb-5">Downstream impact &amp; proposed fix</h2>
          <div className="flex flex-col gap-5">
            <div>
              <label className="form-label">Downstream impact *</label>
              <textarea className="form-textarea" rows={4} value={form.downstream_impact} onChange={(e) => set("downstream_impact", e.target.value)} placeholder="This dataset feeds the executive revenue dashboard used in weekly board reporting…" />
            </div>
            <div>
              <label className="form-label">Proposed fix</label>
              <textarea className="form-textarea" rows={4} value={form.proposed_fix} onChange={(e) => set("proposed_fix", e.target.value)} placeholder="Divide revenue by 100 to restore dollar values. Deduplicate by transaction_id…" />
            </div>
            <div>
              <label className="form-label">Analyst notes</label>
              <textarea className="form-textarea" rows={3} value={form.analyst_notes} onChange={(e) => set("analyst_notes", e.target.value)} placeholder="The source system migration on 2024-06-01 introduced the unit change…" />
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(4)} className="btn-primary">Continue</button>
          </div>
        </div>
      )}

      {/* ── Step 4: Candidate Outcomes ── */}
      {step === 4 && (
        <div className="audit-panel" style={{ padding: 28 }}>
          <h2 className="text-panel-title mb-2">Candidate governance outcomes</h2>
          <p style={{ fontSize: 14, color: "var(--metadata-grey)", lineHeight: 1.6, marginBottom: 20 }}>
            Suggest up to three possible outcomes. These are <em>candidates only</em> — the final verdict is determined exclusively by GenLayer validator consensus.
          </p>
          <div className="flex flex-col gap-5">
            {[
              { field: "candidate_outcome_a", label: "Candidate A", eg: "Approved with warning — fix revenue unit only" },
              { field: "candidate_outcome_b", label: "Candidate B", eg: "Quarantine dataset pending deduplication audit" },
              { field: "candidate_outcome_c", label: "Candidate C", eg: "Reject proposed fix — needs manual review" },
            ].map(({ field, label, eg }) => (
              <div key={field}>
                <label className="form-label">{label}</label>
                <input className="form-input" value={(form as any)[field]} onChange={(e) => set(field, e.target.value)} placeholder={`E.g. ${eg}`} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 8, fontSize: 13, color: "var(--metadata-grey)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--consensus-violet)" }}>GenLayer note:</strong> Validators independently reason over the issue and may select one of these, reject all, or reach a different consensus outcome.
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(3)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(5)} className="btn-primary">Review case</button>
          </div>
        </div>
      )}

      {/* ── Step 5: Review ── */}
      {step === 5 && (
        <div className="flex flex-col gap-5">
          <div className="audit-panel" style={{ padding: 28 }}>
            <h2 className="text-panel-title mb-5">Review governance packet</h2>
            <div className="flex flex-col gap-4">
              {sourceLabel && <Row label="Data source" value={sourceLabel} />}
              <Row label="Dataset" value={selectedDataset?.name ?? "—"} />
              <Row label="Issue type" value={form.issue_type.replace(/_/g, " ")} />
              <Row label="Affected columns" value={form.affected_columns || "—"} />
              <Row label="Proposed fix" value={form.proposed_fix || "—"} />
              <Row label="Downstream impact" value={form.downstream_impact || "—"} />
              {profile && <>
                <Row label="Rows profiled" value={profile.row_count.toLocaleString()} />
                <Row label="Columns" value={String(profile.column_count)} />
                <Row label="Sample rows hash" value={profile.raw_sample_hash.slice(0, 16) + "…"} />
                <Row label="Profile hash" value={profile.profile_hash.slice(0, 16) + "…"} />
                <Row label="Evidence manifest hash" value={profile.evidence_manifest_hash.slice(0, 16) + "…"} />
              </>}
              {form.candidate_outcome_a && <Row label="Candidate A" value={form.candidate_outcome_a} />}
              {form.candidate_outcome_b && <Row label="Candidate B" value={form.candidate_outcome_b} />}
              {form.candidate_outcome_c && <Row label="Candidate C" value={form.candidate_outcome_c} />}
            </div>
            <pre className="hash-block mt-5" style={{ whiteSpace: "pre-wrap", display: "block" }}>
              {JSON.stringify({
                datasetId: form.dataset_id,
                issueType: form.issue_type,
                affectedColumns: form.affected_columns,
                downstreamImpact: form.downstream_impact,
                proposedFix: form.proposed_fix,
                sampleRowsHash: profile?.raw_sample_hash ?? null,
                schemaSnapshotHash: profile?.schema_snapshot_hash ?? null,
                evidenceManifestHash: profile?.evidence_manifest_hash ?? null,
                candidateOutcomes: [
                  form.candidate_outcome_a,
                  form.candidate_outcome_b,
                  form.candidate_outcome_c,
                ].filter(Boolean),
              }, null, 2)}
            </pre>
          </div>

          <div style={{ padding: "16px 20px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: "var(--metadata-grey)", lineHeight: 1.7 }}>
              <strong style={{ color: "var(--consensus-violet)" }}>This case will be evaluated by GenLayer validators.</strong>{" "}
              Qualora prepares the governance packet from your profiled data, but the final verdict is not produced by Qualora alone.
              Validators independently classify the issue, review the proposed fix, assess downstream impact, and reach consensus on the most defensible governance outcome.
              The full dataset is never sent to GenLayer — only structured summaries and evidence hashes.
            </p>
          </div>

          {error && <ErrorBanner message={error} />}

          <div className="flex justify-between">
            <button onClick={() => setStep(4)} className="btn-secondary">Back</button>
            <button onClick={handleSubmit} disabled={loading || !canSubmit} className="btn-primary">
              {loading ? "Creating case…" : "Create governance case"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function ConnectorForm({
  fields, values, onChange, onConnect, connecting, connected, profile, sourceLabel,
}: {
  fields: { key: string; label: string; placeholder: string; secret?: boolean; textarea?: boolean }[]
  values: Record<string, string>
  onChange: (k: string, v: string) => void
  onConnect: () => void
  connecting: boolean
  connected: boolean
  profile: ProfileSummary | null
  sourceLabel: string
}) {
  return (
    <div className="flex flex-col gap-4 mt-2">
      {fields.map(({ key, label, placeholder, secret, textarea }) => (
        <div key={key}>
          <label className="form-label">{label}</label>
          {textarea ? (
            <textarea className="form-textarea" rows={4} value={values[key] ?? ""} onChange={(e) => onChange(key, e.target.value)} placeholder={placeholder} />
          ) : (
            <input type={secret ? "password" : "text"} className="form-input" value={values[key] ?? ""} onChange={(e) => onChange(key, e.target.value)} placeholder={placeholder} />
          )}
        </div>
      ))}
      {connected && profile ? (
        <ProfileCard profile={profile} label={sourceLabel} />
      ) : (
        <button onClick={onConnect} disabled={connecting} className="btn-primary" style={{ alignSelf: "flex-start" }}>
          {connecting ? "Connecting & profiling…" : "Connect & profile"}
        </button>
      )}
    </div>
  )
}

function ProfileCard({ profile, label }: { profile: ProfileSummary; label: string }) {
  const missCols = Object.keys(profile.missingness)
  return (
    <div style={{ padding: "16px 18px", background: "rgba(5,150,105,0.05)", border: "1px solid rgba(5,150,105,0.2)", borderRadius: 10 }}>
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 size={16} color="var(--governance-green)" />
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--governance-green)" }}>Profiled: {label}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
        <Stat label="Rows" value={profile.row_count.toLocaleString()} />
        <Stat label="Columns" value={String(profile.column_count)} />
        <Stat label="Duplicate rows" value={`${(profile.duplication.duplicate_row_pct * 100).toFixed(2)}%`} />
        <Stat label="Columns with nulls" value={String(missCols.length)} />
      </div>
      {missCols.length > 0 && (
        <p style={{ fontSize: 12, color: "var(--metadata-grey)", marginTop: 8 }}>
          Null columns: {missCols.join(", ")}
        </p>
      )}
      <p style={{ fontSize: 11, fontFamily: "var(--font-roboto-mono)", color: "var(--dormant-slate)", marginTop: 8 }}>
        profile: {profile.profile_hash.slice(0, 16)}…
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: "var(--metadata-grey)" }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--control-ink)" }}>{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 16, paddingBottom: 14, borderBottom: "1px solid var(--schema-line)" }}>
      <span style={{ fontSize: 13, color: "var(--metadata-grey)", minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--control-ink)", lineHeight: 1.5 }}>{value}</span>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.22)", borderRadius: 6, fontSize: 13, color: "var(--quarantine-red)" }}>
      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      {message}
    </div>
  )
}

export default function NewCasePage() {
  return (
    <Suspense>
      <NewCaseInner />
    </Suspense>
  )
}
