"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import QualoraMark from "@/components/brand/QualoraMark"
import { Eye, EyeOff } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) { setError("Passwords do not match."); return }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }

    setLoading(true)

    // Supabase updates the password; session was established by the reset link
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Sign out all other sessions so old sessions cannot be reused
    await supabase.auth.signOut({ scope: "others" })

    setDone(true)
    setLoading(false)
    setTimeout(() => router.push("/app/graph"), 2000)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0A1020" }}
    >
      <Link href="/" className="mb-10" style={{ lineHeight: 0 }}>
        <QualoraMark variant="light" size={44} withWordmark={true} />
      </Link>

      <div
        className="w-full max-w-md"
        style={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 14, padding: "36px 40px" }}
      >
        {done ? (
          <div className="text-center">
            <div
              style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "rgba(5,150,105,0.12)", border: "1px solid rgba(5,150,105,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4 4 8-8" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-panel-title mb-2" style={{ color: "#FFFFFF", fontFamily: "var(--font-archivo)" }}>
              Password updated
            </h2>
            <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7 }}>
              Your account and wallet are restored. Redirecting…
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-panel-title mb-1" style={{ color: "#FFFFFF", fontFamily: "var(--font-archivo)" }}>
              Set new password
            </h1>
            <p style={{ fontSize: 13, color: "#64748B", marginBottom: 24, lineHeight: 1.7 }}>
              Set your new password below. Your embedded wallet is permanently attached to your account and will be restored automatically.
            </p>

            <div
              style={{
                background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)",
                borderRadius: 8, padding: "12px 14px", marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
                <strong style={{ color: "#7C3AED" }}>Managed wallet</strong>  -  No seed phrase or recovery key needed. Your wallet comes back with your account.
              </p>
            </div>

            <form onSubmit={handleReset} className="flex flex-col gap-5">
              <div>
                <label className="form-label" style={{ color: "#64748B" }}>New password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" className="form-input"
                    style={{ background: "#0A1020", color: "#F3F6FA", borderColor: "#1E293B", paddingRight: 44 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label" style={{ color: "#64748B" }}>Confirm new password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"} required value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter new password" className="form-input"
                    style={{ background: "#0A1020", color: "#F3F6FA", borderColor: "#1E293B", paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirm((value) => !value)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && (
                <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.22)", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#DC2626" }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%" }}>
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
