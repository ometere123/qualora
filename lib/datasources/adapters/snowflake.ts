import "server-only"
import type { AdapterResult, SnowflakeConnectionConfig } from "../types"
import { profileDataset } from "../profiler"

export async function profileSnowflake(
  config: SnowflakeConnectionConfig,
  credentials: { username: string; password: string }
): Promise<AdapterResult> {
  try {
    const snowflake = await import("snowflake-sdk")

    const connection = snowflake.createConnection({
      account: config.account,
      username: credentials.username,
      password: credentials.password,
      warehouse: config.warehouse,
      database: config.database,
      schema: config.schema_name,
    })

    await new Promise<void>((resolve, reject) => {
      connection.connect((err) => (err ? reject(err) : resolve()))
    })

    const limit = config.row_limit ?? 10000
    const sql = `SELECT * FROM "${config.database}"."${config.schema_name}"."${config.table_name}" LIMIT ${limit}`

    const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        complete: (err, _stmt, rows) => (err ? reject(err) : resolve((rows ?? []) as Record<string, unknown>[])),
      })
    })

    const profile = profileDataset(rows)
    return {
      profile,
      source_label: `Snowflake: ${config.account} / ${config.database}.${config.schema_name}.${config.table_name}`,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("Cannot find module")) {
      throw new Error("Snowflake adapter requires snowflake-sdk. Run: npm install snowflake-sdk")
    }
    throw err
  }
}

export async function testSnowflakeConnection(
  config: SnowflakeConnectionConfig,
  credentials: { username: string; password: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    await profileSnowflake({ ...config, row_limit: 1 }, credentials)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" }
  }
}
