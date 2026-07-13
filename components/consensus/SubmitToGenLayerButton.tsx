"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  caseId: string
  caseData: Record<string, unknown>
  label?: string
}

export default function SubmitToGenLayerButton({ caseId, caseData, label = "Submit to GenLayer" }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)

    const res = await fetch("/api/genlayer/submit-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId }),
    })

    const body = await res.json()

    if (!res.ok) {
      setError(body.error ?? "Submission failed")
      setLoading(false)
      return
    }

    setTxHash(body.txHash)
    setLoading(false)
    setPolling(true)
    pollForVerdict(body.txHash)
  }

  async function pollForVerdict(hash: string, attempts = 0) {
    if (attempts > 60) {
      setPolling(false)
      router.refresh()
      return
    }
    await new Promise((r) => setTimeout(r, 4000))
    const res = await fetch("/api/genlayer/sync-verdict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, txHash: hash }),
    })
    const body = await res.json()
    if (body.status === "finalized") {
      setPolling(false)
      setOpen(false)
      router.push(`/app/consensus/${caseId}`)
    } else {
      pollForVerdict(hash, attempts + 1)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-genlayer">
        {label}
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(10,16,32,0.5)", zIndex: 300, backdropFilter: "blur(2px)" }}
            onClick={() => !loading && !polling && setOpen(false)}
          />
          <div
            style={{
              position: "fixed",
              left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              width: 480,
              background: "var(--audit-white)",
              borderRadius: 14,
              border: "1px solid rgba(124,58,237,0.25)",
              boxShadow: "0 0 0 1px rgba(124,58,237,0.15), 0 20px 60px rgba(10,16,32,0.20)",
              zIndex: 301,
              padding: 32,
            }}
          >
            <div className="source-of-truth-badge mb-4">
              <span className="status-dot" />
              GenLayer Intelligent Contract
            </div>

            <h2 className="text-panel-title mb-2" style={{ color: "var(--control-ink)" }}>
              Submit governance case
            </h2>

            {txHash ? (
              <div>
                <p style={{ fontSize: 14, color: "var(--metadata-grey)", lineHeight: 1.7, marginBottom: 16 }}>
                  Case submitted to StudioNet. Waiting for validator consensus…
                </p>
                <div style={{ background: "var(--frosted-panel)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                  <p className="text-meta mb-1">Transaction hash</p>
                  <span className="hash-block">{txHash}</span>
                </div>
                {polling && (
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: "var(--consensus-violet)",
                        animation: "pulse-violet 2s ease-in-out infinite",
                        flexShrink: 0,
                      }}
                    />
                    <p style={{ fontSize: 13, color: "var(--consensus-violet)" }}>
                      Validators are deliberating…
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p style={{ fontSize: 14, color: "var(--metadata-grey)", lineHeight: 1.7 }}>
                  Your embedded wallet will sign this governance case and submit it to the GenLayer Intelligent Contract for validator consensus.
                </p>

                <div
                  style={{
                    background: "rgba(124,58,237,0.06)",
                    border: "1px solid rgba(124,58,237,0.18)",
                    borderRadius: 8,
                    padding: "12px 14px",
                  }}
                >
                  <p style={{ fontSize: 12, color: "var(--metadata-grey)", lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--consensus-violet)" }}>Managed wallet</strong>  -  Your Qualora wallet is securely attached to your account. No password or seed phrase is required to sign governance actions.
                  </p>
                </div>

                {error && (
                  <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.22)", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "var(--quarantine-red)" }}>
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setOpen(false)} className="btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button onClick={handleSubmit} disabled={loading} className="btn-genlayer" style={{ flex: 2 }}>
                    {loading ? "Submitting to StudioNet…" : label}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
