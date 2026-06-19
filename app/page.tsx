import Link from "next/link"

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "#0A1020" }}>

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-8 py-5">
        <span
          style={{
            fontFamily: "var(--font-archivo)",
            fontSize: 20,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
          }}
        >
          Qualora
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="btn-secondary btn-sm"
            style={{ color: "#94A3B8", borderColor: "#334155", background: "transparent" }}
          >
            Sign in
          </Link>
          <Link href="/auth/signup" className="btn-primary btn-sm">
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingBottom: 80 }}
      >
        <div
          className="verdict-badge verdict-pending mb-8"
          style={{ fontSize: 11, letterSpacing: "0.1em" }}
        >
          GENLAYER POWERED GOVERNANCE ORACLE
        </div>

        <h1 className="text-hero mb-5" style={{ color: "#FFFFFF", maxWidth: 760 }}>
          Consensus backed<br />data quality governance
        </h1>

        <p
          className="mb-10"
          style={{
            fontFamily: "var(--font-source-sans)",
            fontSize: 18,
            color: "#64748B",
            lineHeight: 1.75,
            maxWidth: 520,
          }}
        >
          Classify missingness, duplication, schema drift, and unsafe fixes
          with GenLayer validator consensus — before flawed data reaches
          dashboards, AI systems, or executive decisions.
        </p>

        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/auth/signup"
            className="btn-primary"
            style={{ height: 48, padding: "0 28px", fontSize: 15 }}
          >
            Create governance case
          </Link>
          <Link
            href="/auth/login"
            className="btn-secondary"
            style={{
              height: 48,
              padding: "0 28px",
              fontSize: 15,
              color: "#94A3B8",
              borderColor: "#334155",
              background: "transparent",
            }}
          >
            Sign in
          </Link>
        </div>

        {/* ── Graph Preview ── */}
        <div
          className="mt-16 rounded-panel"
          style={{
            border: "1px solid #1E293B",
            background: "#0F172A",
            padding: "32px 40px",
            maxWidth: 680,
            width: "100%",
          }}
        >
          <p
            className="text-badge-label mb-6"
            style={{ color: "#334155", letterSpacing: "0.1em" }}
          >
            GOVERNANCE CASE GRAPH
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { label: "Dataset", color: "#334155" },
              { label: "→", color: "#1E293B", noBorder: true },
              { label: "Issue", color: "#D97706", text: "#D97706" },
              { label: "→", color: "#1E293B", noBorder: true },
              { label: "Evidence", color: "#334155" },
              { label: "→", color: "#1E293B", noBorder: true },
              { label: "Fix Proposal", color: "#334155" },
              { label: "→", color: "#1E293B", noBorder: true },
              { label: "GenLayer", color: "#7C3AED", text: "#7C3AED" },
              { label: "→", color: "#1E293B", noBorder: true },
              { label: "Verdict Seal", color: "#059669", text: "#059669" },
            ].map((node, i) =>
              node.noBorder ? (
                <span key={i} style={{ color: "#334155", fontSize: 18, fontWeight: 300 }}>
                  {node.label}
                </span>
              ) : (
                <div
                  key={i}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: `1px solid ${node.color}`,
                    color: node.text || "#94A3B8",
                    fontSize: 12,
                    fontFamily: "var(--font-source-sans)",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                >
                  {node.label}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Footer label ── */}
      <div className="flex justify-center pb-10">
        <span
          className="source-of-truth-badge"
          style={{ fontSize: 10, letterSpacing: "0.1em" }}
        >
          <span className="status-dot" />
          SOURCE OF TRUTH: GENLAYER INTELLIGENT CONTRACT
        </span>
      </div>
    </main>
  )
}
