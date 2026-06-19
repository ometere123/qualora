"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import QualoraMark from "@/components/brand/QualoraMark"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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
        style={{
          background: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: 14,
          padding: "36px 40px",
        }}
      >
        {sent ? (
          <div className="text-center">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(5,150,105,0.12)",
                border: "1px solid rgba(5,150,105,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4 4 8-8" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2
              className="text-panel-title mb-2"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-archivo)" }}
            >
              Check your email
            </h2>
            <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>
              We sent a password reset link to <strong style={{ color: "#94A3B8" }}>{email}</strong>.
              After resetting your password, you will need your recovery key to restore wallet access.
            </p>
            <Link href="/auth/login" className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1
              className="text-panel-title mb-1"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-archivo)" }}
            >
              Reset password
            </h1>
            <p className="text-meta mb-8">
              We will send a reset link to your email. Your embedded wallet is not affected.
            </p>

            <form onSubmit={handleReset} className="flex flex-col gap-5">
              <div>
                <label className="form-label" style={{ color: "#64748B" }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organisation.com"
                  className="form-input"
                  style={{ background: "#0A1020", color: "#F3F6FA", borderColor: "#1E293B" }}
                />
              </div>

              {error && (
                <p className="form-error">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: "100%" }}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p
              className="text-center mt-6"
              style={{ fontSize: 13, color: "#64748B" }}
            >
              <Link href="/auth/login" style={{ color: "#06B6D4" }}>
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
