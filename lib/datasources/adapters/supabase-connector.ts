import "server-only"
import type { AdapterResult, SupabaseConnectionConfig } from "../types"
import { profileDataset } from "../profiler"

export async function profileSupabase(
  config: SupabaseConnectionConfig,
  anonKey: string
): Promise<AdapterResult> {
  const limit = config.row_limit ?? 10000
  const url = `${config.project_url}/rest/v1/${config.table_name}?limit=${limit}`

  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase query failed (${res.status}): ${body}`)
  }

  const rows = await res.json()
  if (!Array.isArray(rows)) throw new Error("Supabase response was not an array")

  const profile = profileDataset(rows)
  return {
    profile,
    source_label: `Supabase: ${config.project_url.replace("https://", "").split(".")[0]} / ${config.table_name}`,
  }
}

export async function testSupabaseConnection(
  config: SupabaseConnectionConfig,
  anonKey: string
): Promise<{ ok: boolean; error?: string; row_count?: number }> {
  try {
    const url = `${config.project_url}/rest/v1/${config.table_name}?limit=1`
    const res = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const rows = await res.json()
    return { ok: true, row_count: Array.isArray(rows) ? rows.length : undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
