"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    display_name: "",
    organisation: "",
    job_title: "",
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, organisation, job_title")
        .eq("user_id", user.id)
        .single()
      if (profile) {
        setForm({
          display_name: profile.display_name ?? "",
          organisation: profile.organisation ?? "",
          job_title: profile.job_title ?? "",
        })
      }
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Not authenticated"); setLoading(false); return }

    const { error: err } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name,
        organisation: form.organisation,
        job_title: form.job_title,
      })
      .eq("user_id", user.id)

    setLoading(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    router.refresh()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 640 }}>
      <h1 className="text-page-title mb-6" style={{ color: "var(--control-ink)" }}>Settings</h1>

      <form onSubmit={handleSubmit}>
        <div className="audit-panel" style={{ padding: 28, marginBottom: 20 }}>
          <p className="text-badge-label mb-5" style={{ color: "var(--metadata-grey)" }}>PROFILE</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="form-label">Display name</label>
              <input
                type="text"
                className="form-input"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="form-label">Organisation</label>
              <input
                type="text"
                className="form-input"
                value={form.organisation}
                onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                placeholder="Your organisation"
              />
            </div>
            <div>
              <label className="form-label">Job title</label>
              <input
                type="text"
                className="form-input"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                placeholder="Your role"
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 16, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.22)", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "var(--quarantine-red)" }}>
              {error}
            </div>
          )}
          {saved && (
            <div style={{ marginTop: 16, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.20)", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "var(--governance-green)" }}>
              Profile updated.
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      {/* Notifications */}
      <div className="audit-panel" style={{ padding: 28, marginBottom: 20 }}>
        <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>NOTIFICATIONS</p>
        <div className="flex flex-col gap-4">
          {[
            { label: "Verdict received", desc: "Notify me when a GenLayer consensus verdict is returned for my case." },
            { label: "Consensus pending", desc: "Notify me when a submitted case enters the pending consensus state." },
            { label: "Evidence required", desc: "Notify me when a case needs additional evidence before submission." },
          ].map((n) => (
            <div key={n.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--control-ink)" }}>{n.label}</p>
                <p style={{ fontSize: 12, color: "var(--metadata-grey)", marginTop: 3 }}>{n.desc}</p>
              </div>
              <span style={{ fontSize: 11, color: "var(--metadata-grey)", padding: "4px 10px", borderRadius: 999, border: "1px solid var(--schema-line)", background: "var(--frosted-panel)" }}>Coming soon</span>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet */}
      <div className="audit-panel" style={{ padding: 28, marginBottom: 20 }}>
        <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>EMBEDDED WALLET</p>
        <p style={{ fontSize: 13, color: "var(--metadata-grey)", lineHeight: 1.7, marginBottom: 16 }}>
          Your GenLayer wallet is encrypted with your password and protected by a 12-word recovery phrase.
          The raw private key never leaves the server. If you forget your password, you must use your recovery phrase.
        </p>
        <div style={{ padding: "12px 16px", background: "rgba(217,119,6,0.06)", borderRadius: 8, border: "1px solid rgba(217,119,6,0.20)", marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: "var(--policy-amber)", lineHeight: 1.6 }}>
            Your recovery phrase was shown once at signup. If you did not record it, you cannot recover your wallet if you lose your password. Keep it safe and offline.
          </p>
        </div>
        <a href="/app/profile" className="btn-secondary btn-sm">View wallet address</a>
      </div>

      {/* Security */}
      <div className="audit-panel" style={{ padding: 28, marginBottom: 20 }}>
        <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>SECURITY</p>
        <p style={{ fontSize: 13, color: "var(--metadata-grey)", lineHeight: 1.7, marginBottom: 16 }}>
          Change your password — this also rewraps your embedded wallet encryption key.
          You will need your recovery phrase to complete this action.
        </p>
        <a href="/auth/reset-password" className="btn-secondary btn-sm">Change password</a>
      </div>

      <div className="audit-panel" style={{ padding: 28, borderColor: "rgba(220,38,38,0.18)" }}>
        <p className="text-badge-label mb-4" style={{ color: "var(--quarantine-red)" }}>SIGN OUT</p>
        <p style={{ fontSize: 13, color: "var(--metadata-grey)", lineHeight: 1.7, marginBottom: 16 }}>
          Sign out from this device. Your wallet and data remain safely stored.
        </p>
        <button onClick={handleSignOut} className="btn-risk btn-sm">Sign out</button>
      </div>
    </div>
  )
}
