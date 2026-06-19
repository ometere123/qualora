import "server-only"
import type { AdapterResult, BigQueryConnectionConfig } from "../types"
import { profileDataset } from "../profiler"

export async function profileBigQuery(
  config: BigQueryConnectionConfig,
  serviceAccountJson: string
): Promise<AdapterResult> {
  try {
    const { BigQuery } = await import("@google-cloud/bigquery")
    const credentials = JSON.parse(serviceAccountJson)
    const bq = new BigQuery({ credentials, projectId: config.project_id })

    const limit = config.row_limit ?? 10000
    const query = `SELECT * FROM \`${config.project_id}.${config.dataset_id}.${config.table_id}\` LIMIT ${limit}`
    const [rows] = await bq.query({ query })

    const profile = profileDataset(rows as Record<string, unknown>[])
    return {
      profile,
      source_label: `BigQuery: ${config.project_id}.${config.dataset_id}.${config.table_id}`,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("Cannot find module")) {
      throw new Error("BigQuery adapter requires @google-cloud/bigquery. Run: npm install @google-cloud/bigquery")
    }
    throw err
  }
}

export async function testBigQueryConnection(
  config: BigQueryConnectionConfig,
  serviceAccountJson: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await profileBigQuery({ ...config, row_limit: 1 }, serviceAccountJson)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" }
  }
}
