import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { profileSupabase } from "@/lib/datasources/adapters/supabase-connector"
import { profilePostgres } from "@/lib/datasources/adapters/postgres"
import { profileApi } from "@/lib/datasources/adapters/api"
import { profileBigQuery } from "@/lib/datasources/adapters/bigquery"
import { profileSnowflake } from "@/lib/datasources/adapters/snowflake"
import crypto from "crypto"
import type { DataSourceType } from "@/lib/datasources/types"

const AES_KEY = Buffer.from(
  process.env.WALLET_MASTER_SECRET!.slice(0, 64).padEnd(64, "0"),
  "hex"
)

function encryptCredentials(obj: Record<string, unknown>): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", AES_KEY, iv)
  const plain = JSON.stringify(obj)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return JSON.stringify({
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: enc.toString("hex"),
  })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createAdminClient()
    const { data: ws } = await admin.from("workspaces").select("id").eq("user_id", user.id).limit(1).single()
    if (!ws) return NextResponse.json({ error: "No workspace" }, { status: 400 })

    const body = await request.json()
    const { type, name, config, credentials } = body as {
      type: DataSourceType
      name: string
      config: Record<string, unknown>
      credentials: Record<string, unknown>
    }

    // Run profiling based on source type
    let result
    switch (type) {
      case "supabase_connection":
        result = await profileSupabase(config as any, credentials.anon_key as string)
        break
      case "postgres_connection":
        result = await profilePostgres(config as any, credentials.password as string)
        break
      case "api_connection":
        result = await profileApi(config as any, (credentials.headers ?? {}) as Record<string, string>)
        break
      case "bigquery_connection":
        result = await profileBigQuery(config as any, credentials.service_account_json as string)
        break
      case "snowflake_connection":
        result = await profileSnowflake(config as any, credentials as any)
        break
      default:
        return NextResponse.json({ error: `Unknown source type: ${type}` }, { status: 400 })
    }

    const encryptedCreds = encryptCredentials(credentials)

    // Persist data_source
    const { data: ds, error: dsErr } = await admin.from("data_sources").insert({
      workspace_id: ws.id,
      user_id: user.id,
      type,
      name: name || result.source_label,
      status: "active",
      encrypted_credentials: encryptedCreds,
      connection_config: config,
    }).select("id").single()
    if (dsErr) throw dsErr

    // Persist profile
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
      raw_sample_hash: result.profile.raw_sample_hash,
    }).select("id").single()
    if (profErr) throw profErr

    return NextResponse.json({
      ok: true,
      data_source_id: ds.id,
      profile_id: profile_row.id,
      source_label: result.source_label,
      profile: result.profile,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error("[datasources/connect]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
