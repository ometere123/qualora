"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle } from "lucide-react"

const STEPS = ["Profile", "Organisation", "Complete"]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [dataFunction, setDataFunction] = useState("")
  const [primaryDataset, setPrimaryDataset] = useState("")
  const [governanceRole, setGovernanceRole] = useState("")
  const [workspaceName, setWorkspaceName] = useState("")

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/auth/login"); return }
    const { error: err } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id)
    if (err) { setError(err.message); setLoading(false); return }
    setStep(1)
    setLoading(false)
  }

  async function handleOrgSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/auth/login"); return }

    const { error: wsError } = await supabase.from("workspaces").insert({
      user_id: user.id,
      name: workspaceName || orgName,
      organisation_name: orgName,
      data_function: dataFunction,
      primary_dataset_type: primaryDataset,
      governance_role: governanceRole,
    })
    if (wsError) { setError(wsError.message); setLoading(false); return }

    const { error: completeErr } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id)
    if (completeErr) { setError(completeErr.message); setLoading(false); return }
    setStep(2)
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--ledger-mist)" }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-10 justify-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`step-circle ${i === step ? "step-active" : i < step ? "step-done" : "step-inactive"}`}>
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 32, height: 1, background: i < step ? "var(--governance-green)" : "var(--schema-line)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Profile */}
        {step === 0 && (
          <div className="audit-panel" style={{ padding: 36 }}>
            <h1 className="text-panel-title mb-1" style={{ color: "var(--control-ink)" }}>Set up your profile</h1>
            <p className="text-meta mb-7">How should we address you in the governance system?</p>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5">
              <div>
                <label className="form-label">Display name</label>
                <input required className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jordan Chen" />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%" }}>
                {loading ? "Saving…" : "Continue"}
              </button>
            </form>
          </div>
        )}

        {/* Step 1: Organisation */}
        {step === 1 && (
          <div className="audit-panel" style={{ padding: 36 }}>
            <h1 className="text-panel-title mb-1">Organisation &amp; data environment</h1>
            <p className="text-meta mb-7">Tell us about your data governance context.</p>
            <form onSubmit={handleOrgSubmit} className="flex flex-col gap-5">
              <div>
                <label className="form-label">Organisation name</label>
                <input required className="form-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Analytics" />
              </div>
              <div>
                <label className="form-label">Workspace name</label>
                <input className="form-input" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Data Quality Team (leave blank to use org name)" />
              </div>
              <div>
                <label className="form-label">Data function</label>
                <select className="form-select" value={dataFunction} onChange={(e) => setDataFunction(e.target.value)}>
                  <option value="">Select…</option>
                  <option>Analytics Engineering</option>
                  <option>Data Science</option>
                  <option>Business Intelligence</option>
                  <option>Data Governance</option>
                  <option>Data Engineering</option>
                  <option>Operations Analytics</option>
                </select>
              </div>
              <div>
                <label className="form-label">Primary dataset type</label>
                <select className="form-select" value={primaryDataset} onChange={(e) => setPrimaryDataset(e.target.value)}>
                  <option value="">Select…</option>
                  <option>Transactional</option>
                  <option>Event / Clickstream</option>
                  <option>Financial</option>
                  <option>Customer / CRM</option>
                  <option>Operational</option>
                  <option>ML / AI training data</option>
                </select>
              </div>
              <div>
                <label className="form-label">Governance role</label>
                <select className="form-select" value={governanceRole} onChange={(e) => setGovernanceRole(e.target.value)}>
                  <option value="">Select…</option>
                  <option>Data Quality Lead</option>
                  <option>Analytics Engineer</option>
                  <option>Data Steward</option>
                  <option>Compliance Reviewer</option>
                  <option>Executive Sponsor</option>
                </select>
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%" }}>
                {loading ? "Saving…" : "Continue"}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Complete */}
        {step === 2 && (
          <div className="audit-panel" style={{ padding: 40, textAlign: "center" }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(5,150,105,0.10)",
                border: "1px solid rgba(5,150,105,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <CheckCircle size={24} color="var(--governance-green)" />
            </div>
            <h1 className="text-panel-title mb-2">Workspace ready</h1>
            <p style={{ fontSize: 14, color: "var(--metadata-grey)", lineHeight: 1.7, marginBottom: 20 }}>
              Your profile, workspace, and embedded wallet are set up.
            </p>

            {/* Managed wallet notice */}
            <div
              style={{
                background: "rgba(124,58,237,0.06)",
                border: "1px solid rgba(124,58,237,0.18)",
                borderRadius: 8,
                padding: "14px 18px",
                marginBottom: 28,
                textAlign: "left",
              }}
            >
              <p style={{ fontSize: 13, color: "var(--metadata-grey)", lineHeight: 1.7 }}>
                <strong style={{ color: "var(--consensus-violet)" }}>Your Qualora wallet</strong> is securely attached to your account.
                If you ever recover your account, your wallet comes back with it  -  no seed phrase required.
              </p>
            </div>

            <div className="source-of-truth-badge" style={{ justifyContent: "center", marginBottom: 28 }}>
              <span className="status-dot" />
              Source of truth: GenLayer Intelligent Contract
            </div>
            <button onClick={() => router.push("/app/graph")} className="btn-primary" style={{ width: "100%" }}>
              Enter Governance Graph
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
