"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Suspense } from "react"

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sent = searchParams.get("sent")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      const msg = signUpError.message
      setError(!msg || msg === "{}" ? "Signup failed — check your Supabase email settings." : msg)
      setLoading(false)
      return
    }

    // If confirmation is disabled, Supabase returns a session immediately
    if (data.session) {
      // Create wallet + profile now via API
      await fetch("/api/wallet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user!.id, email }),
      })
      setLoading(false)
      router.push("/app/onboarding")
      router.refresh()
      return
    }

    // Confirmation required — show check-email screen
    setLoading(false)
    router.push("/auth/signup?sent=1")
    router.refresh()
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0A1020" }}>
        <div className="w-full max-w-md" style={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 14, padding: "40px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(6,182,212,0.10)", border: "1px solid rgba(6,182,212,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 6l9 6 9-6M2 6v10a1 1 0 001 1h16a1 1 0 001-1V6M2 6a1 1 0 011-1h16a1 1 0 011 1" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 style={{ fontFamily: "var(--font-archivo)", fontSize: 20, fontWeight: 700, color: "#FFFFFF", marginBottom: 12 }}>Check your email</h2>
          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, marginBottom: 8 }}>
            We sent a confirmation link to <strong style={{ color: "#F3F6FA" }}>{email || "your email"}</strong>.
          </p>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
            Click the link to confirm your account. Your embedded wallet will be created automatically once confirmed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0A1020" }}
    >
      {/* Logo */}
      <Link href="/" className="mb-10">
        <span
          style={{
            fontFamily: "var(--font-archivo)",
            fontSize: 22,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
          }}
        >
          Qualora
        </span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-md"
        style={{
          background: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: 14,
          padding: "36px 40px",
        }}
      >
        <h1
          className="text-panel-title mb-1"
          style={{ color: "#FFFFFF", fontFamily: "var(--font-archivo)" }}
        >
          Create account
        </h1>
        <p className="text-meta mb-8">
          Your embedded wallet is created automatically
        </p>

        <form onSubmit={handleSignup} className="flex flex-col gap-5">
          <div>
            <label className="form-label" style={{ color: "#64748B" }}>
              Work email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organisation.com"
              className="form-input"
              style={{ background: "#0A1020", color: "#F3F6FA", borderColor: "#1E293B" }}
            />
          </div>

          <div>
            <label className="form-label" style={{ color: "#64748B" }}>
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="form-input"
              style={{ background: "#0A1020", color: "#F3F6FA", borderColor: "#1E293B" }}
            />
          </div>

          <div>
            <label className="form-label" style={{ color: "#64748B" }}>
              Confirm password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="form-input"
              style={{ background: "#0A1020", color: "#F3F6FA", borderColor: "#1E293B" }}
            />
          </div>

          {error && (
            <div
              style={{
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.22)",
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 13,
                color: "#DC2626",
                fontFamily: "var(--font-source-sans)",
              }}
            >
              {error}
            </div>
          )}

          {/* Wallet notice */}
          <div
            style={{
              background: "rgba(124,58,237,0.07)",
              border: "1px solid rgba(124,58,237,0.18)",
              borderRadius: 6,
              padding: "10px 14px",
              fontSize: 12,
              color: "#94A3B8",
              fontFamily: "var(--font-source-sans)",
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: "#7C3AED", fontWeight: 600 }}>Embedded wallet</span> — A blockchain wallet is
            automatically created and encrypted with your password. You will set a recovery key in the next step.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", marginTop: 4 }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p
          className="text-center mt-6"
          style={{ fontSize: 13, color: "#64748B", fontFamily: "var(--font-source-sans)" }}
        >
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "#06B6D4" }}>
            Sign in
          </Link>
        </p>
      </div>

      <p
        className="mt-8 text-center"
        style={{ fontSize: 11, color: "#334155", fontFamily: "var(--font-source-sans)", letterSpacing: "0.06em" }}
      >
        POWERED BY GENLAYER · CONSENSUS BACKED GOVERNANCE
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
