"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import QualoraMark from "@/components/brand/QualoraMark"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push("/app/graph")
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0A1020" }}
    >
      {/* Logo */}
      <Link href="/" className="mb-10" style={{ lineHeight: 0 }}>
        <QualoraMark variant="light" size={44} withWordmark={true} />
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
          Sign in
        </h1>
        <p className="text-meta mb-8">
          Access your governance workspace
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="form-label" style={{ color: "#64748B" }}>
              Email address
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="form-label" style={{ color: "#64748B", marginBottom: 0 }}>
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                style={{ fontSize: 12, color: "#06B6D4" }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", marginTop: 4 }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p
          className="text-center mt-6"
          style={{ fontSize: 13, color: "#64748B", fontFamily: "var(--font-source-sans)" }}
        >
          No account?{" "}
          <Link href="/auth/signup" style={{ color: "#06B6D4" }}>
            Create one
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
