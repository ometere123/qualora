import "server-only"
import crypto from "crypto"
import type { DatasetProfile, ColumnProfile } from "./types"

export type RawRow = Record<string, unknown>

/**
 * Takes raw rows from any adapter and produces a normalized DatasetProfile.
 * This is the single profiling function all adapters must call.
 */
export function profileDataset(
  rows: RawRow[],
  opts: {
    expected_cadence?: string
    last_updated?: string
    baseline_row_count?: number
    expected_min?: number
    expected_max?: number
    previous_columns?: string[]
  } = {}
): DatasetProfile {
  if (rows.length === 0) {
    const empty = emptyProfile()
    return empty
  }

  const allKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const row_count = rows.length
  const column_count = allKeys.length

  // Column profiles
  const columns: ColumnProfile[] = allKeys.map((col) => {
    const values = rows.map((r) => r[col])
    const nulls = values.filter((v) => v === null || v === undefined || v === "").length
    const nonNulls = values.filter((v) => v !== null && v !== undefined && v !== "")
    const unique = new Set(nonNulls.map(String)).size
    const inferredType = inferType(nonNulls)
    return {
      name: col,
      type: inferredType,
      nullable: nulls > 0,
      null_count: nulls,
      null_pct: row_count > 0 ? nulls / row_count : 0,
      unique_count: unique,
      sample_values: nonNulls.slice(0, 5).map(String),
    }
  })

  // Missingness: col → null pct (only cols with any nulls)
  const missingness: Record<string, number> = {}
  columns.forEach((c) => {
    if (c.null_pct > 0) missingness[c.name] = c.null_pct
  })

  // Duplication: exact duplicate rows
  const rowStrs = rows.map((r) => JSON.stringify(allKeys.map((k) => r[k])))
  const rowCounts = new Map<string, number>()
  rowStrs.forEach((s) => rowCounts.set(s, (rowCounts.get(s) ?? 0) + 1))
  const dupRows = Array.from(rowCounts.values()).filter((c) => c > 1).reduce((a, c) => a + c, 0)
  const duplicate_row_pct = row_count > 0 ? dupRows / row_count : 0

  // Find likely key columns (high uniqueness, no nulls)
  const duplicate_key_cols = columns
    .filter((c) => c.null_pct === 0 && (c.unique_count ?? 0) / row_count < 0.95)
    .map((c) => c.name)

  // Schema drift vs previous columns
  const prev = opts.previous_columns ?? []
  const cur = allKeys
  const schema_drift = {
    added: cur.filter((c) => !prev.includes(c)),
    removed: prev.filter((c) => !cur.includes(c)),
    type_changed: {} as Record<string, { from: string; to: string }>,
  }

  // Freshness
  let hours_stale: number | null = null
  if (opts.last_updated) {
    const ms = Date.now() - new Date(opts.last_updated).getTime()
    hours_stale = ms / 3_600_000
  }

  // Validity: flag columns where numeric values are negative (common data quality signal)
  const validity: Record<string, { fail_pct: number; rule: string }> = {}
  columns.forEach((c) => {
    if (c.type === "number") {
      const vals = rows.map((r) => Number(r[c.name])).filter((v) => !isNaN(v))
      const negatives = vals.filter((v) => v < 0).length
      if (negatives > 0) {
        validity[c.name] = {
          fail_pct: negatives / row_count,
          rule: "no_negative_values",
        }
      }
    }
  })

  // Volume
  const row_count_delta_pct =
    opts.baseline_row_count != null && opts.baseline_row_count > 0
      ? (row_count - opts.baseline_row_count) / opts.baseline_row_count
      : null

  // Hashes
  const schemaSrc = JSON.stringify(columns.map((c) => ({ n: c.name, t: c.type })))
  const schema_snapshot_hash = sha256(schemaSrc)

  const sampleSrc = JSON.stringify(rows.slice(0, 50))
  const raw_sample_hash = sha256(sampleSrc)

  const profileSrc = JSON.stringify({ row_count, column_count, missingness, duplicate_row_pct })
  const profile_hash = sha256(profileSrc)

  const evidence_manifest_json = JSON.stringify({
    schema: "qualora.evidence.v1",
    row_count,
    column_count,
    missingness,
    duplication: { duplicate_row_pct, duplicate_row_count: dupRows, duplicate_key_cols },
    schema_drift,
    freshness: {
      last_updated: opts.last_updated ?? null,
      expected_cadence: opts.expected_cadence ?? null,
      hours_stale,
    },
    validity,
    volume: {
      row_count_delta_pct,
      expected_min: opts.expected_min ?? null,
      expected_max: opts.expected_max ?? null,
    },
    integrity: {
      raw_sample_sha256: raw_sample_hash,
      schema_snapshot_sha256: schema_snapshot_hash,
      profile_sha256: profile_hash,
    },
    columns: columns.map((column) => ({
      name: column.name,
      type: column.type,
      nullable: column.nullable,
      null_count: column.null_count,
      null_pct: column.null_pct,
      unique_count: column.unique_count ?? null,
    })),
  })
  const evidence_manifest_hash = sha256(evidence_manifest_json)

  return {
    row_count,
    column_count,
    columns,
    missingness,
    duplication: { duplicate_row_pct, duplicate_key_cols, duplicate_row_count: dupRows },
    schema_drift,
    freshness: {
      last_updated: opts.last_updated ?? null,
      expected_cadence: opts.expected_cadence ?? null,
      hours_stale,
    },
    validity,
    volume: {
      row_count_delta_pct,
      expected_min: opts.expected_min ?? null,
      expected_max: opts.expected_max ?? null,
    },
    profile_hash,
    schema_snapshot_hash,
    raw_sample_hash,
    evidence_manifest_hash,
    evidence_manifest_json,
  }
}

function inferType(values: unknown[]): string {
  if (values.length === 0) return "unknown"
  const sample = values.slice(0, 20)
  const allNum = sample.every((v) => !isNaN(Number(v)) && v !== "" && v !== null)
  if (allNum) return "number"
  const allBool = sample.every((v) => v === true || v === false || v === "true" || v === "false")
  if (allBool) return "boolean"
  const dateRe = /^\d{4}-\d{2}-\d{2}/
  const allDate = sample.every((v) => typeof v === "string" && dateRe.test(v))
  if (allDate) return "datetime"
  return "string"
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex")
}

function emptyProfile(): DatasetProfile {
  return {
    row_count: 0,
    column_count: 0,
    columns: [],
    missingness: {},
    duplication: { duplicate_row_pct: 0, duplicate_key_cols: [], duplicate_row_count: 0 },
    schema_drift: { added: [], removed: [], type_changed: {} },
    freshness: { last_updated: null, expected_cadence: null, hours_stale: null },
    validity: {},
    volume: { row_count_delta_pct: null, expected_min: null, expected_max: null },
    profile_hash: "",
    schema_snapshot_hash: "",
    raw_sample_hash: "",
    evidence_manifest_hash: "",
    evidence_manifest_json: "",
  }
}
