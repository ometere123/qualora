import assert from "node:assert/strict"
import crypto from "node:crypto"
import { spawn, spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import nextEnv from "@next/env"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const BASE_URL = process.env.QUALORA_E2E_BASE_URL ?? "http://localhost:3000"
const CONTRACT = "0xa45FD2E0A4a4858279872454fa592Aee1FAB87e1"
let currentStage = "startup"

function safeError(err) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 4).join("\n"),
    }
  }
  if (err && typeof err === "object") {
    return Object.fromEntries(Object.getOwnPropertyNames(err).map((key) => [key, err[key]]))
  }
  return String(err)
}

function hash(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex")
}

function assertSubmitRouteWiring() {
  const source = readFileSync("app/api/genlayer/submit-case/route.ts", "utf8")
  assert.match(source, /from "genlayer-js"/)
  assert.match(source, /\.writeContract\(/)
  assert.match(source, /functionName:\s*"submit_case"/)
  assert.doesNotMatch(source, /leaderOnly\s*:/)
  const submitCall = source.indexOf('functionName: "submit_case"')
  const start = source.indexOf("args: [", submitCall)
  const end = source.indexOf("],\n    })", start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  assert.equal([...source.slice(start, end).matchAll(/\bpacket\.[A-Za-z0-9_]+/g)].length, 27)
}

async function waitForHealth() {
  const started = Date.now()
  let lastError = ""
  while (Date.now() - started < 120_000) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`)
      if (res.ok) return await res.json()
      lastError = `${res.status} ${await res.text()}`
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000))
  }
  throw new Error(`Next server did not become healthy: ${lastError}`)
}

async function startServer() {
  try {
    const health = await waitForHealth()
    return { child: null, health }
  } catch {}

  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  })

  let logs = ""
  child.stdout.on("data", (chunk) => {
    logs += chunk.toString()
  })
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString()
  })

  try {
    const health = await waitForHealth()
    return { child, health }
  } catch (err) {
    child.kill()
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nServer logs:\n${logs.slice(-4000)}`)
  }
}

function makeCookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ")
}

async function createSession(userEmail, password) {
  const jar = new Map()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return [...jar.entries()].map(([name, value]) => ({ name, value }))
        },
        setAll(cookies) {
          for (const cookie of cookies) {
            if (cookie.value) jar.set(cookie.name, cookie.value)
            else jar.delete(cookie.name)
          }
        },
      },
    }
  )
  const { data, error } = await supabase.auth.signInWithPassword({ email: userEmail, password })
  if (error) throw error
  if (!data.user) throw new Error("Supabase sign-in did not return a user.")
  return { user: data.user, cookieHeader: makeCookieHeader(jar) }
}

async function seedFreshCase(admin, userId, email) {
  await admin.from("profiles").upsert({
    user_id: userId,
    email,
    display_name: "Qualora E2E",
    role: "user",
    onboarding_completed: true,
  }, { onConflict: "user_id" })

  const { data: workspace, error: workspaceError } = await admin.from("workspaces").insert({
    user_id: userId,
    name: "Qualora E2E Workspace",
    organisation_name: "Qualora QA",
    data_function: "Data quality governance",
    data_environment: "StudioNet QA",
    primary_dataset_type: "Customer operations",
    governance_role: "Data steward",
  }).select("id").single()
  if (workspaceError) throw workspaceError

  const rows = [
    { customer_id: "C-1001", customer_email: "ada@example.test", signup_date: "2026-06-01", mrr: 120 },
    { customer_id: "C-1002", customer_email: "", signup_date: "2026-06-02", mrr: 80 },
    { customer_id: "C-1002", customer_email: "", signup_date: "2026-06-02", mrr: 80 },
    { customer_id: "C-1003", customer_email: "lin@example.test", signup_date: "2026-06-04", mrr: 220 },
  ]
  const columns = [
    { name: "customer_id", type: "string", nullable: false },
    { name: "customer_email", type: "string", nullable: true },
    { name: "signup_date", type: "date", nullable: false },
    { name: "mrr", type: "number", nullable: false },
  ]
  const profile = {
    row_count: rows.length,
    column_count: columns.length,
    columns,
    missingness: { customer_email: 0.5 },
    duplication: { duplicate_row_pct: 0.25, duplicate_rows: 1 },
    schema_drift: { drift_detected: false, summary: "No schema drift detected against QA baseline." },
    freshness: { status: "fresh", newest_record_at: "2026-06-04", summary: "Latest record is inside expected cadence." },
    validity: { invalid_values_pct: 0, summary: "No invalid values detected in profiled sample." },
    volume: { observed_rows: rows.length, baseline_rows: 4, summary: "Volume is aligned with baseline." },
  }
  const rawSampleHash = hash(rows)
  const schemaSnapshotHash = hash(columns)
  const evidenceManifestHash = hash({ rawSampleHash, schemaSnapshotHash, generatedBy: "qualora-live-e2e" })
  const profileHash = hash({ profile, rawSampleHash, schemaSnapshotHash, evidenceManifestHash })

  const { data: dataset, error: datasetError } = await admin.from("datasets").insert({
    user_id: userId,
    workspace_id: workspace.id,
    name: `Qualora live E2E dataset ${Date.now()}`,
    domain: "customer_success",
    owner_name: "Qualora QA",
    source_system: "live_e2e_seed",
    refresh_cadence: "daily",
    downstream_consumers: "Revenue operations dashboard",
    business_criticality: "high",
    schema_summary: "customer_id, customer_email, signup_date, mrr",
    expected_primary_key: "customer_id",
    quality_expectations: "Email completeness above 95%, no duplicate customer_id rows.",
    row_count_estimate: rows.length,
    owner_team: "Data Governance",
  }).select("id").single()
  if (datasetError) throw datasetError

  const { data: dataSource, error: dataSourceError } = await admin.from("data_sources").insert({
    workspace_id: workspace.id,
    user_id: userId,
    type: "file_upload",
    name: "qualora-live-e2e.csv",
    status: "active",
    connection_config: { file_type: "csv", original_name: "qualora-live-e2e.csv", source: "live-e2e" },
  }).select("id").single()
  if (dataSourceError) throw dataSourceError

  const { data: datasetProfile, error: profileError } = await admin.from("dataset_profiles").insert({
    data_source_id: dataSource.id,
    row_count: profile.row_count,
    column_count: profile.column_count,
    columns_json: profile.columns,
    missingness_json: profile.missingness,
    duplication_json: profile.duplication,
    schema_drift_json: profile.schema_drift,
    freshness_json: profile.freshness,
    validity_json: profile.validity,
    volume_json: profile.volume,
    profile_hash: profileHash,
    schema_snapshot_hash: schemaSnapshotHash,
    evidence_manifest_hash: evidenceManifestHash,
    raw_sample_hash: rawSampleHash,
  }).select("id").single()
  if (profileError) throw profileError

  const { data: governanceCase, error: caseError } = await admin.from("governance_cases").insert({
    user_id: userId,
    workspace_id: workspace.id,
    dataset_id: dataset.id,
    data_source_id: dataSource.id,
    profile_id: datasetProfile.id,
    issue_type: "missingness",
    affected_columns: "customer_email, customer_id",
    missingness_summary: "customer_email is missing in 50.0% of profiled rows.",
    duplication_summary: "25.0% of profiled rows are exact duplicates.",
    schema_drift_summary: "No schema drift detected against QA baseline.",
    freshness_summary: "Latest record is inside expected daily cadence.",
    invalid_values_summary: "No invalid values detected in profiled sample.",
    historical_baseline_summary: "Baseline expects email completeness above 95% and unique customer_id.",
    downstream_impact: "Revenue operations dashboard and renewal prioritization depend on this dataset.",
    proposed_fix: "Backfill customer_email from CRM identity records and deduplicate customer_id before dashboard refresh.",
    analyst_notes: "Live E2E case generated to verify full GenLayer validator consensus.",
    candidate_outcome_a: "Approve the fix after email backfill and duplicate removal are validated.",
    candidate_outcome_b: "Require human review if CRM identity matching confidence is low.",
    candidate_outcome_c: "Quarantine dashboard refresh until duplicate customer records are resolved.",
    status: "draft",
  }).select("id").single()
  if (caseError) throw caseError

  return {
    caseId: governanceCase.id,
    datasetId: dataset.id,
    profileId: datasetProfile.id,
    sampleRowsHash: rawSampleHash,
    evidenceManifestHash,
  }
}

async function main() {
  currentStage = "assert-submit-route-wiring"
  assertSubmitRouteWiring()

  currentStage = "assert-env"
  assert.equal(process.env.GENLAYER_CONTRACT_ADDRESS, CONTRACT)
  assert.equal(process.env.NEXT_PUBLIC_QUALORA_CONTRACT_ADDRESS, CONTRACT)
  assert.ok(process.env.GENLAYER_PRIVATE_KEY)

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  currentStage = "start-next-server"
  const server = await startServer()
  const health = server.health
  assert.equal(health.genlayer.contract, CONTRACT)
  assert.equal(health.genlayer.has_private_key, true)

  currentStage = "create-supabase-user"
  const email = `qualora-e2e-${Date.now()}-${crypto.randomBytes(3).toString("hex")}@example.com`
  const password = `Qa!${crypto.randomBytes(18).toString("hex")}`
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError) throw createError
  if (!created.user) throw new Error("Supabase admin did not create a user.")

  let completed = false
  try {
    currentStage = "create-browser-session"
    const { cookieHeader } = await createSession(email, password)
    currentStage = "seed-fresh-case"
    const seeded = await seedFreshCase(admin, created.user.id, email)

    currentStage = "submit-case-route"
    const submitRes = await fetch(`${BASE_URL}/api/genlayer/submit-case`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ caseId: seeded.caseId }),
    })
    const submitJson = await submitRes.json()

    if (!submitRes.ok) {
      console.log(JSON.stringify({
        ok: false,
        stage: "submit-case",
        status: submitRes.status,
        case_id: seeded.caseId,
        tx_hash: submitJson.txHash ?? null,
        error: submitJson.error ?? null,
        execution_result_name:
          submitJson.receipt?.txExecutionResultName ??
          submitJson.receipt?.tx_execution_result_name ??
          submitJson.receipt?.executionResultName ??
          null,
      }, null, 2))
      process.exit(1)
    }

    currentStage = "debug-case-route"
    const debugRes = await fetch(`${BASE_URL}/api/genlayer/debug-case?caseId=${seeded.caseId}`, {
      headers: { Cookie: cookieHeader },
    })
    const debugJson = await debugRes.json()
    if (!debugRes.ok) {
      console.log(JSON.stringify({
        ok: false,
        stage: "debug-case",
        status: debugRes.status,
        case_id: seeded.caseId,
        tx_hash: submitJson.txHash ?? null,
        error: debugJson.error ?? debugJson,
      }, null, 2))
      process.exit(1)
    }

    currentStage = "supabase-verdict-readback"
    const verdictRows = await admin
      .from("genlayer_governance_verdicts")
      .select("*")
      .eq("governance_case_id", seeded.caseId)
      .limit(1)
    if (verdictRows.error) throw verdictRows.error

    currentStage = "consensus-page-fetch"
    const consensusPage = await fetch(`${BASE_URL}/app/consensus/${seeded.caseId}`, {
      headers: { Cookie: cookieHeader },
    })
    const consensusHtml = await consensusPage.text()
    const verdict = verdictRows.data?.[0] ?? null
    const card = debugJson.get_case_summary_card ?? null

    console.log(JSON.stringify({
      ok: true,
      case_id: seeded.caseId,
      dataset_id: seeded.datasetId,
      profile_id: seeded.profileId,
      tx_hash: submitJson.txHash ?? null,
      execution_result_name:
        submitJson.receipt?.txExecutionResultName ??
        submitJson.receipt?.tx_execution_result_name ??
        submitJson.receipt?.executionResultName ??
        null,
      full_validator_consensus_used: true,
      leader_only_used: false,
      contract_address: health.genlayer.contract,
      account_address: health.genlayer.account_address,
      has_case: debugJson.has_case,
      get_case_status: debugJson.case_status,
      get_case_summary_card: card,
      supabase_mirrored_after_readback: Boolean(verdict),
      consensus_page_status: consensusPage.status,
      consensus_page_contains_verdict: verdict ? consensusHtml.includes(verdict.verdict) : false,
      verdict_matches_contract_read:
        Boolean(verdict && card) &&
        String(card.verdict ?? "").toLowerCase() === String(verdict.verdict ?? "").toLowerCase(),
      sample_rows_hash: seeded.sampleRowsHash,
      evidence_manifest_hash: seeded.evidenceManifestHash,
    }, null, 2))
    completed = true
  } finally {
    if (!completed) await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
    if (server.child && server.child.pid) {
      spawnSync("taskkill", ["/PID", String(server.child.pid), "/T", "/F"], { stdio: "ignore" })
    }
  }
}

main().catch((err) => {
  console.log(JSON.stringify({
    ok: false,
    stage: currentStage,
    error: safeError(err),
  }, null, 2))
  process.exit(1)
})
