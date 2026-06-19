import "server-only"
import type { AdapterResult, ApiConnectionConfig } from "../types"
import { profileDataset } from "../profiler"

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

export async function profileApi(
  config: ApiConnectionConfig,
  headers: Record<string, string> = {}
): Promise<AdapterResult> {
  const res = await fetch(config.endpoint_url, {
    method: config.method,
    headers: { "Content-Type": "application/json", ...headers },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`API request failed (${res.status}): ${await res.text()}`)
  }

  const json = await res.json()

  let rows: unknown[]
  if (config.json_path) {
    const nested = getNestedValue(json, config.json_path)
    if (!Array.isArray(nested)) throw new Error(`json_path "${config.json_path}" did not resolve to an array`)
    rows = nested
  } else if (Array.isArray(json)) {
    rows = json
  } else {
    // Try to find the first array value
    const firstArray = Object.values(json as Record<string, unknown>).find(Array.isArray)
    if (!firstArray) throw new Error("API response does not contain an array. Specify json_path to locate the data.")
    rows = firstArray as unknown[]
  }

  const limit = config.row_limit ?? 10000
  const sliced = rows.slice(0, limit) as Record<string, unknown>[]

  const profile = profileDataset(sliced)
  return {
    profile,
    source_label: `API: ${config.endpoint_url}`,
  }
}

export async function testApiConnection(
  config: ApiConnectionConfig,
  headers: Record<string, string> = {}
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(config.endpoint_url, {
      method: config.method,
      headers: { "Content-Type": "application/json", ...headers },
      signal: AbortSignal.timeout(8000),
    })
    return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" }
  }
}
