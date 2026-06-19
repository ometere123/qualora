import Link from "next/link"

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0A1020" }}
    >
      <div className="text-center">
        <p className="text-badge-label mb-4" style={{ color: "#06B6D4" }}>
          GOVERNANCE ROUTE NOT FOUND — 404
        </p>
        <h1
          className="text-page-title mb-4"
          style={{ color: "#FFFFFF", fontFamily: "var(--font-archivo)" }}
        >
          Page not found
        </h1>
        <p className="mb-8" style={{ color: "#64748B", fontSize: 16 }}>
          This path does not exist in the Qualora governance system.
        </p>
        <Link
          href="/"
          className="btn-secondary"
          style={{ color: "#94A3B8", borderColor: "#334155", background: "transparent" }}
        >
          Return to Qualora
        </Link>
      </div>
    </main>
  )
}
