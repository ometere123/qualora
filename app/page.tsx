import Link from "next/link"
import QualoraMark from "@/components/brand/QualoraMark"

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "#0A1020" }}>

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-8 py-5">
        <QualoraMark variant="light" size={36} withWordmark={true} />
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

      {/* ── Problem section ── */}
      <section style={{ padding: "80px 40px", borderTop: "1px solid #1E293B", textAlign: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#475569", marginBottom: 16 }}>THE PROBLEM</p>
        <h2 style={{ fontFamily: "var(--font-archivo)", fontSize: 36, fontWeight: 700, color: "#E2E8F0", maxWidth: 700, margin: "0 auto 20px", lineHeight: 1.3 }}>
          Flawed data reaches decisions before anyone notices
        </h2>
        <p style={{ fontSize: 16, color: "#64748B", lineHeight: 1.8, maxWidth: 560, margin: "0 auto 56px" }}>
          Schema changes break downstream pipelines. Duplicate records distort aggregates. Missing values silently corrupt ML models. Traditional validation rules can&apos;t adjudicate ambiguous cases — they just pass or fail.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 860, margin: "0 auto" }}>
          {[
            { icon: "⚠", label: "Schema Drift", desc: "Columns renamed, added, or dropped without notice — breaking contracts silently." },
            { icon: "⧉", label: "Duplication", desc: "Repeated records inflate counts and skew aggregates before analytics runs." },
            { icon: "∅", label: "Missingness", desc: "Null or blank values propagate through joins, corrupting downstream outputs." },
          ].map((p) => (
            <div key={p.label} style={{ padding: "28px 24px", border: "1px solid #1E293B", borderRadius: 12, textAlign: "left", background: "#0F172A" }}>
              <p style={{ fontSize: 22, marginBottom: 12 }}>{p.icon}</p>
              <p style={{ fontFamily: "var(--font-archivo)", fontSize: 16, fontWeight: 600, color: "#CBD5E1", marginBottom: 8 }}>{p.label}</p>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── GenLayer adjudication section ── */}
      <section style={{ padding: "80px 40px", borderTop: "1px solid #1E293B", textAlign: "center", background: "rgba(124,58,237,0.04)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#7C3AED", marginBottom: 16 }}>HOW IT WORKS</p>
        <h2 style={{ fontFamily: "var(--font-archivo)", fontSize: 36, fontWeight: 700, color: "#E2E8F0", maxWidth: 700, margin: "0 auto 20px", lineHeight: 1.3 }}>
          GenLayer validators reach consensus on every case
        </h2>
        <p style={{ fontSize: 16, color: "#64748B", lineHeight: 1.8, maxWidth: 560, margin: "0 auto 56px" }}>
          Each governance case is submitted to an Intelligent Contract on GenLayer. Multiple validators independently evaluate the issue, evidence, and proposed fix — then reach verifiable consensus.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600, margin: "0 auto" }}>
          {[
            { step: "1", label: "Submit case", desc: "Analyst documents the issue with affected columns, downstream impact, and proposed fix." },
            { step: "2", label: "Attach evidence", desc: "CSV samples, schema snapshots, and statistical summaries are hashed and anchored." },
            { step: "3", label: "GenLayer consensus", desc: "Multiple validators run independently and vote — producing a binding governance verdict." },
            { step: "4", label: "Verdict seal", desc: "Outcome is written on-chain: quarantine, approve, approve with warning, or flag for review." },
          ].map((s) => (
            <div key={s.step} style={{ display: "flex", alignItems: "flex-start", gap: 20, padding: "20px 24px", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, background: "rgba(124,58,237,0.04)", textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#A78BFA" }}>{s.step}</span>
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-archivo)", fontSize: 15, fontWeight: 600, color: "#C4B5FD", marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Use cases section ── */}
      <section style={{ padding: "80px 40px", borderTop: "1px solid #1E293B", textAlign: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#475569", marginBottom: 16 }}>USE CASES</p>
        <h2 style={{ fontFamily: "var(--font-archivo)", fontSize: 36, fontWeight: 700, color: "#E2E8F0", maxWidth: 700, margin: "0 auto 20px", lineHeight: 1.3 }}>
          Built for teams who care about data provenance
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, maxWidth: 860, margin: "48px auto 0" }}>
          {[
            { label: "Data Engineering", desc: "Detect schema drift before it breaks your pipeline contracts. GenLayer confirms which changes are governance violations vs. safe migrations." },
            { label: "ML Teams", desc: "Flag training data with missingness or duplication anomalies. Get a consensus-backed verdict before promoting a dataset to production." },
            { label: "Analytics & BI", desc: "Validate KPI source data before publishing dashboards. Attach evidence CSVs and let validators classify the risk level." },
            { label: "Data Governance Teams", desc: "Maintain an auditable on-chain record of every quality issue, fix proposal, and governance outcome for your datasets." },
          ].map((u) => (
            <div key={u.label} style={{ padding: "28px 24px", border: "1px solid #1E293B", borderRadius: 12, textAlign: "left", background: "#0F172A" }}>
              <p style={{ fontFamily: "var(--font-archivo)", fontSize: 16, fontWeight: 600, color: "#CBD5E1", marginBottom: 10 }}>{u.label}</p>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7 }}>{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo verdict section ── */}
      <section style={{ padding: "80px 40px", borderTop: "1px solid #1E293B", textAlign: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#475569", marginBottom: 16 }}>EXAMPLE VERDICT</p>
        <h2 style={{ fontFamily: "var(--font-archivo)", fontSize: 36, fontWeight: 700, color: "#E2E8F0", maxWidth: 700, margin: "0 auto 32px", lineHeight: 1.3 }}>
          A real GenLayer governance outcome
        </h2>
        <div style={{ maxWidth: 680, margin: "0 auto", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 16, background: "#0F172A", padding: "32px", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#7C3AED", marginBottom: 6 }}>GENLAYER VERDICT</p>
              <div style={{ display: "inline-flex", padding: "8px 20px", borderRadius: 8, background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)" }}>
                <span style={{ fontFamily: "var(--font-archivo)", fontSize: 16, fontWeight: 700, color: "#F87171", textTransform: "uppercase", letterSpacing: "0.04em" }}>QUARANTINE DATASET</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>SEVERITY</p>
              <p style={{ fontFamily: "var(--font-archivo)", fontSize: 18, fontWeight: 700, color: "#F87171" }}>Critical</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {[
              { label: "Issue type", value: "Schema drift" },
              { label: "Evidence grade", value: "A — High quality" },
              { label: "Confidence", value: "High consensus" },
              { label: "Fix safety", value: "Unsafe to apply" },
            ].map((f) => (
              <div key={f.label} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid #1E293B" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#475569", letterSpacing: "0.06em", marginBottom: 4 }}>{f.label.toUpperCase()}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#CBD5E1" }}>{f.value}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: "16px", background: "rgba(124,58,237,0.06)", borderRadius: 8, border: "1px solid rgba(124,58,237,0.15)", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 8, letterSpacing: "0.06em" }}>CONSENSUS REASONING</p>
            <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7 }}>
              The dataset exhibits critical schema changes — three columns removed without migration, causing null propagation across 14 downstream aggregates. Validators unanimously classify this as a governance violation requiring quarantine before any further use.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED" }} />
            <span style={{ fontSize: 11, color: "#475569", letterSpacing: "0.06em" }}>SOURCE OF TRUTH: GENLAYER INTELLIGENT CONTRACT</span>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "80px 40px", borderTop: "1px solid #1E293B", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-archivo)", fontSize: 36, fontWeight: 700, color: "#E2E8F0", maxWidth: 600, margin: "0 auto 20px", lineHeight: 1.3 }}>
          Stop guessing. Start governing.
        </h2>
        <p style={{ fontSize: 16, color: "#64748B", marginBottom: 40 }}>Start your first governance case in minutes.</p>
        <Link href="/auth/signup" className="btn-primary" style={{ height: 52, padding: "0 36px", fontSize: 16 }}>
          Create governance case
        </Link>
      </section>

      {/* ── Footer label ── */}
      <div className="flex justify-center pb-10" style={{ borderTop: "1px solid #1E293B", paddingTop: 32 }}>
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
