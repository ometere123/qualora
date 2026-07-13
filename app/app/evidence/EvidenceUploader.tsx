"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function EvidenceUploader({ caseId }: { caseId?: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [message, setMessage] = useState("")

  if (!caseId) return null

  async function upload() {
    if (!file) return
    setState("uploading")
    setMessage("")
    const form = new FormData()
    form.append("file", file)
    form.append("caseId", caseId)
    try {
      const response = await fetch("/api/evidence/upload-url", { method: "POST", body: form })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "Upload failed")
      setState("done")
      setMessage(`Uploaded and hashed: ${body.evidenceHash.slice(0, 16)}…`)
      setFile(null)
      router.refresh()
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Upload failed")
    }
  }

  return (
    <div style={{ marginBottom: 20, padding: 20, border: "1px solid var(--schema-line)", borderRadius: 10, background: "var(--frosted-panel)" }}>
      <p className="text-badge-label mb-2" style={{ color: "var(--consensus-violet)" }}>ADD RECHECK EVIDENCE</p>
      <p style={{ fontSize: 13, color: "var(--metadata-grey)", lineHeight: 1.5, marginBottom: 12 }}>
        Upload the cleaned CSV or other supporting file to this case. The file is stored privately, hashed, and included in the next recheck submission.
      </p>
      <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
        <input type="file" accept=".csv,.json,.txt,.xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button type="button" className="btn-genlayer" disabled={!file || state === "uploading"} onClick={upload}>
          {state === "uploading" ? "Uploading…" : "Upload evidence"}
        </button>
      </div>
      {message && <p style={{ marginTop: 10, fontSize: 12, color: state === "error" ? "var(--quarantine-red)" : "var(--governance-green)" }}>{message}</p>}
    </div>
  )
}
