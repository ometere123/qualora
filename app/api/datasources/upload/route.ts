import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { profileCsv, profileJson } from "@/lib/datasources/adapters/file"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createAdminClient()
    const { data: ws } = await admin.from("workspaces").select("id").eq("user_id", user.id).limit(1).single()
    if (!ws) return NextResponse.json({ error: "No workspace" }, { status: 400 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const name = file.name
    const ext = name.split(".").pop()?.toLowerCase() ?? ""
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex")
    const storagePath = `${user.id}/${Date.now()}_${name}`

    let result
    if (ext === "csv") {
      result = await profileCsv(buffer.toString("utf-8"), { original_name: name })
    } else if (ext === "json") {
      const parsed = JSON.parse(buffer.toString("utf-8"))
      result = await profileJson(parsed, { original_name: name })
    } else {
      return NextResponse.json({ error: "Unsupported file type. Upload CSV or JSON for governance profiling." }, { status: 400 })
    }

    if (result.profile.row_count <= 0 || result.profile.column_count <= 0) {
      return NextResponse.json({ error: "Uploaded file did not contain any profileable dataset rows." }, { status: 400 })
    }

    const { error: uploadErr } = await admin.storage
      .from("evidence")
      .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" })
    if (uploadErr) throw uploadErr

    const { data: ds, error: dsErr } = await admin.from("data_sources").insert({
      workspace_id: ws.id,
      user_id: user.id,
      type: "file_upload",
      name,
      status: "active",
      connection_config: { file_path: storagePath, file_type: ext, original_name: name },
    }).select("id").single()
    if (dsErr) throw dsErr

    const { error: efError } = await admin.from("evidence_files").insert({
      data_source_id: ds.id,
      user_id: user.id,
      file_path: storagePath,
      file_hash: fileHash,
      file_type: ext,
      file_bucket: "evidence",
    })
    if (efError) throw new Error(`evidence_files insert: ${efError.message} (code: ${efError.code})`)

    const { data: profile_row, error: profErr } = await admin.from("dataset_profiles").insert({
      data_source_id: ds.id,
      row_count: result.profile.row_count,
      column_count: result.profile.column_count,
      columns_json: result.profile.columns,
      missingness_json: result.profile.missingness,
      duplication_json: result.profile.duplication,
      schema_drift_json: result.profile.schema_drift,
      freshness_json: result.profile.freshness,
      validity_json: result.profile.validity,
      volume_json: result.profile.volume,
      profile_hash: result.profile.profile_hash,
      schema_snapshot_hash: result.profile.schema_snapshot_hash,
      evidence_manifest_hash: result.profile.evidence_manifest_hash,
      evidence_manifest_json: result.profile.evidence_manifest_json,
      raw_sample_hash: result.profile.raw_sample_hash,
    }).select("id,evidence_public_token").single()
    if (profErr) throw profErr

    return NextResponse.json({
      ok: true,
      data_source_id: ds.id,
      profile_id: profile_row.id,
      evidence_public_token: profile_row.evidence_public_token,
      source_label: result.source_label,
      profile: result.profile,
      file_hash: fileHash,
      storage_path: storagePath,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error("[datasources/upload]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
