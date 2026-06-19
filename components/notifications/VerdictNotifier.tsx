"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface Toast {
  id: string
  verdict: string
  caseId: string
}

export default function VerdictNotifier({ userId }: { userId: string }) {
  const router = useRouter()
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("verdict-notifier")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "genlayer_governance_verdicts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; verdict: string; governance_case_id: string }
          const toast: Toast = { id: row.id, verdict: row.verdict, caseId: row.governance_case_id }
          setToasts((prev) => [...prev, toast])
          router.refresh()
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id))
          }, 8000)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, router])

  if (!toasts.length) return null

  return (
    <div style={{ position: "fixed", bottom: 80, right: 24, zIndex: 500, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: "var(--audit-white)",
            border: "1px solid rgba(124,58,237,0.30)",
            borderRadius: 12,
            padding: "14px 18px",
            boxShadow: "0 4px 24px rgba(10,16,32,0.18)",
            maxWidth: 320,
            animation: "slide-in-right 0.25s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--consensus-violet)", flexShrink: 0 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--consensus-violet)", letterSpacing: "0.06em" }}>
              GENLAYER VERDICT RECEIVED
            </p>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--control-ink)", marginBottom: 8, textTransform: "capitalize" }}>
            {t.verdict.replace(/_/g, " ")}
          </p>
          <a
            href={`/app/consensus/${t.caseId}`}
            style={{ fontSize: 12, color: "var(--validation-cyan)", textDecoration: "none", fontWeight: 600 }}
          >
            Open Consensus Chamber →
          </a>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--metadata-grey)", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
