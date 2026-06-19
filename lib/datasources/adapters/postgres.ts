import "server-only"
import type { AdapterResult, PostgresConnectionConfig } from "../types"
import { profileDataset } from "../profiler"

// Dynamically import pg to avoid bundling it when unused
async function getPg() {
  try {
    const { default: pg } = await import("pg")
    return pg
  } catch {
    throw new Error("pg package not installed. Run: npm install pg @types/pg")
  }
}

export async function profilePostgres(
  config: PostgresConnectionConfig,
  password: string
): Promise<AdapterResult> {
  const pg = await getPg()
  const client = new pg.Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
  })

  await client.connect()
  try {
    const limit = config.row_limit ?? 10000
    const result = await client.query(
      `SELECT * FROM ${escapeIdentifier(config.table_name)} LIMIT $1`,
      [limit]
    )
    const rows = result.rows
    const profile = profileDataset(rows)
    return {
      profile,
      source_label: `PostgreSQL: ${config.host}/${config.database} / ${config.table_name}`,
    }
  } finally {
    await client.end()
  }
}

export async function testPostgresConnection(
  config: PostgresConnectionConfig,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const pg = await getPg()
    const client = new pg.Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 8000,
    })
    await client.connect()
    await client.query("SELECT 1")
    await client.end()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" }
  }
}

function escapeIdentifier(name: string): string {
  // Only allow alphanumeric + underscore + dot (schema.table)
  if (!/^[\w.]+$/.test(name)) throw new Error("Invalid table name")
  return name.split(".").map((p) => `"${p}"`).join(".")
}
