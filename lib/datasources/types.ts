export type DataSourceType =
  | "file_upload"
  | "supabase_connection"
  | "postgres_connection"
  | "api_connection"
  | "bigquery_connection"
  | "snowflake_connection"

export interface ColumnProfile {
  name: string
  type: string
  nullable: boolean
  null_count: number
  null_pct: number
  unique_count?: number
  sample_values?: string[]
}

export interface DatasetProfile {
  row_count: number
  column_count: number
  columns: ColumnProfile[]
  missingness: Record<string, number>     // col → null pct
  duplication: {
    duplicate_row_pct: number
    duplicate_key_cols: string[]
    duplicate_row_count: number
  }
  schema_drift: {
    added: string[]
    removed: string[]
    type_changed: Record<string, { from: string; to: string }>
  }
  freshness: {
    last_updated: string | null
    expected_cadence: string | null
    hours_stale: number | null
  }
  validity: Record<string, { fail_pct: number; rule: string }>
  volume: {
    row_count_delta_pct: number | null
    expected_min: number | null
    expected_max: number | null
  }
  profile_hash: string
  schema_snapshot_hash: string
  evidence_manifest_hash: string
  raw_sample_hash: string
}

// What each adapter must produce
export interface AdapterResult {
  profile: DatasetProfile
  source_label: string     // human-readable description of what was connected
}

export interface FileUploadConfig {
  file_path: string         // Supabase Storage path
  file_type: "csv" | "xlsx" | "json" | "schema"
  original_name: string
}

export interface SupabaseConnectionConfig {
  project_url: string
  table_name: string
  row_limit?: number
}

export interface PostgresConnectionConfig {
  host: string
  port: number
  database: string
  username: string
  ssl: boolean
  table_name: string
  row_limit?: number
}

export interface ApiConnectionConfig {
  endpoint_url: string
  method: "GET" | "POST"
  json_path?: string       // dot-path to the data array, e.g. "data.items"
  row_limit?: number
}

export interface BigQueryConnectionConfig {
  project_id: string
  dataset_id: string
  table_id: string
  row_limit?: number
}

export interface SnowflakeConnectionConfig {
  account: string
  warehouse: string
  database: string
  schema_name: string
  table_name: string
  row_limit?: number
}
