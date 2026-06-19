import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sha256Hex } from "@/lib/utils/hash"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const caseId = formData.get("caseId") as string | null

    if (!file || !caseId) {
      return NextResponse.json({ error: "file and caseId are required" }, { status: 400 })
    }

    // Read file bytes for hashing
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const evidenceHash = sha256Hex(buffer.toString("base64"))

    // Store in Supabase Storage under user-scoped path
    const storagePath = `${user.id}/${caseId}/${Date.now()}-${file.name}`
    const admin = createAdminClient()
    const { error: storageErr } = await admin.storage
      .from("evidence-files")
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (storageErr) {
      return NextResponse.json({ error: storageErr.message }, { status: 500 })
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl: fileUrl } } = admin.storage
      .from("evidence-files")
      .getPublicUrl(storagePath)

    // Record in database — column names must match the evidence_files schema exactly
    const { data: record, error: dbErr } = await admin.from("evidence_files").insert({
      user_id: user.id,
      governance_case_id: caseId,
      file_path: storagePath,
      file_url: fileUrl,
      file_bucket: "evidence-files",
      file_type: file.type,
      file_size: buffer.byteLength,
      evidence_hash: evidenceHash,
      uploaded_by: user.id,
    }).select("id").single()

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, evidenceId: record!.id, evidenceHash, storagePath })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
