import "server-only"
import type { AdapterResult } from "../types"
import type { RawRow } from "../profiler"
import { profileDataset } from "../profiler"

/**
 * Profiles a CSV string. Parses headers + rows, calls shared profiler.
 */
export async function profileCsv(
  csvText: string,
  opts: { original_name?: string; expected_cadence?: string } = {}
): Promise<AdapterResult> {
  const rows = parseCsv(csvText)
  const profile = profileDataset(rows, { expected_cadence: opts.expected_cadence })
  return {
    profile,
    source_label: opts.original_name ? `File: ${opts.original_name}` : "Uploaded CSV",
  }
}

/**
 * Profiles a parsed JSON array. Accepts any array of objects.
 */
export async function profileJson(
  data: unknown,
  opts: { original_name?: string; expected_cadence?: string } = {}
): Promise<AdapterResult> {
  const rows = normalizeJsonInput(data)
  const profile = profileDataset(rows, { expected_cadence: opts.expected_cadence })
  return {
    profile,
    source_label: opts.original_name ? `File: ${opts.original_name}` : "Uploaded JSON",
  }
}

// ── helpers ─────────────────────────────────────────────────

function parseCsv(text: string): RawRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n")
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0])
  const rows: RawRow[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const vals = splitCsvLine(lines[i])
    const row: RawRow = {}
    headers.forEach((h, idx) => {
      const raw = vals[idx] ?? ""
      row[h] = raw === "" ? null : raw
    })
    rows.push(row)
  }
  return rows
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"' && !inQuotes) { inQuotes = true; continue }
    if (ch === '"' && inQuotes) {
      if (line[i + 1] === '"') { cur += '"'; i++; continue }
      inQuotes = false; continue
    }
    if (ch === "," && !inQuotes) { result.push(cur.trim()); cur = ""; continue }
    cur += ch
  }
  result.push(cur.trim())
  return result
}

function normalizeJsonInput(data: unknown): RawRow[] {
  if (Array.isArray(data)) return data as RawRow[]
  if (typeof data === "object" && data !== null) {
    // Check if there's a nested array under some key
    for (const val of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(val)) return val as RawRow[]
    }
  }
  return []
}
