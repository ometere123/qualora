"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AdminNoteForm({ adminUserId }: { adminUserId: string }) {
  const router = useRouter()
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase
      .from("admin_review_notes")
      .insert({ admin_user_id: adminUserId, note: note.trim() })

    setSaving(false)
    if (err) { setError(err.message); return }
    setNote("")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--metadata-grey)", letterSpacing: "0.05em", marginBottom: 8 }}>ADD NOTE</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Write an admin note about a case, user, or platform issue…"
        rows={3}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 13,
          color: "var(--control-ink)",
          background: "var(--frosted-panel)",
          border: "1px solid var(--schema-line)",
          borderRadius: 8,
          resize: "vertical",
          fontFamily: "var(--font-source-sans)",
          lineHeight: 1.6,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {error && (
        <p style={{ fontSize: 12, color: "var(--quarantine-red)", marginTop: 6 }}>{error}</p>
      )}
      <div style={{ marginTop: 10 }}>
        <button
          type="submit"
          disabled={saving || !note.trim()}
          className="btn-primary btn-sm"
        >
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </form>
  )
}
