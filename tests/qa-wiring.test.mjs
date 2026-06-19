import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { test } from "node:test"

const ROOT = process.cwd()
const NEW_ADDRESS = "0x49852638d1A3DA1996380b1e88923439d9713235"
const OLD_ADDRESS = ["0x0f56ef8082ACefb", "146F69951538217bf9e6a8418"].join("")

function read(path) {
  return readFileSync(join(ROOT, path), "utf8")
}

function files(dir = ROOT, acc = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(name)) continue
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) files(full, acc)
    else acc.push(full)
  }
  return acc
}

function countSubmitArgs(source) {
  const start = source.indexOf("args: [")
  assert.notEqual(start, -1, "submit route must contain writeContract args")
  const end = source.indexOf("],\n    })", start)
  assert.notEqual(end, -1, "submit route args block must terminate before writeContract close")
  return [...source.slice(start, end).matchAll(/\bpacket\.[A-Za-z0-9_]+/g)].length
}

test("environment contract address wiring uses new address and exact public alias", () => {
  const env = read(".env.local")
  assert.match(env, new RegExp(`^GENLAYER_CONTRACT_ADDRESS=${NEW_ADDRESS}$`, "m"))
  assert.match(env, new RegExp(`^NEXT_PUBLIC_QUALORA_CONTRACT_ADDRESS=${NEW_ADDRESS}$`, "m"))
  assert.ok(
    env.includes(`NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=${NEW_ADDRESS}`) ||
    env.includes(`NEXT_PUBLIC_QUALORA_CONTRACT_ADDRESS=${NEW_ADDRESS}`),
    "a browser-safe contract address must be configured"
  )
})

test("old contract address is absent outside dependencies/build output", () => {
  const hits = files().filter((file) => {
    const rel = relative(ROOT, file)
    if (rel === "package-lock.json") return false
    return readFileSync(file, "utf8").includes(OLD_ADDRESS)
  })
  assert.deepEqual(hits.map((file) => relative(ROOT, file)), [])
})

test("real submit route uses genlayer-js full consensus writeContract with 27 args", () => {
  const source = read("app/api/genlayer/submit-case/route.ts")
  assert.match(source, /from "genlayer-js"/)
  assert.match(source, /process\.env\.GENLAYER_PRIVATE_KEY/)
  assert.match(source, /\.writeContract\(/)
  assert.match(source, /functionName:\s*"submit_case"/)
  assert.equal(countSubmitArgs(source), 27)
  assert.doesNotMatch(source, /sendTransaction\(/)
  assert.doesNotMatch(source, /leaderOnly\s*:/)
  assert.match(source, /waitForTransactionReceipt\(/)
  assert.match(source, /TransactionStatus\.FINALIZED/)
  assert.match(source, /isSuccessfulExecution\(receipt\)/)
  assert.match(source, /has_case/)
  assert.match(source, /get_case_status/)
  assert.match(source, /get_case_summary_card/)
  assert.match(source, /genlayer_governance_verdicts/)
})

test("GenLayer payload is hash and summary based, never full dataset content", () => {
  const packet = read("lib/genlayer/packet.ts")
  const submit = read("app/api/genlayer/submit-case/route.ts")
  assert.match(packet, /sampleRowsHash/)
  assert.match(packet, /schemaSnapshotHash/)
  assert.match(packet, /evidenceManifestHash/)
  assert.match(submit, /profileRow\.raw_sample_hash/)
  assert.match(submit, /Missing required profile hashes/)
  assert.doesNotMatch(submit, /csvText|rawCsv|rawJson|fileBody|uploaded file body/i)
  assert.doesNotMatch(packet, /rows\.slice|raw CSV|raw JSON|file body/i)
  assert.match(packet, /assertCandidateOutcomesSafe/)
  assert.match(packet, /Public evidence URLs must use HTTPS/)
})

test("readback routes use genlayer-js readContract surfaces", () => {
  for (const route of ["app/api/genlayer/sync-verdict/route.ts", "app/api/genlayer/debug-case/route.ts"]) {
    const source = read(route)
    assert.match(source, /from "genlayer-js"/)
    assert.match(source, /\.readContract\(/)
    assert.match(source, /has_case/)
    assert.match(source, /get_case_status/)
    assert.match(source, /get_case_summary_card/)
    assert.doesNotMatch(source, /provider\.call|eth_call/)
  }
})

test("debug route returns readback, receipt, and decoded payload details", () => {
  const source = read("app/api/genlayer/debug-case/route.ts")
  assert.match(source, /contractAddress/)
  assert.match(source, /tx_execution_result/)
  assert.match(source, /functionName/)
  assert.match(source, /argCount/)
  assert.match(source, /case_id/)
  assert.match(source, /evidence_hash/)
  assert.match(source, /sample_rows_hash/)
  assert.match(source, /has_case_error/)
  assert.match(source, /case_status_error/)
  assert.match(source, /summary_card_error/)
})

test("data source intake routes normalize profiles and reject invalid file inputs", () => {
  const upload = read("app/api/datasources/upload/route.ts")
  const connect = read("app/api/datasources/connect/route.ts")
  assert.match(upload, /profileCsv/)
  assert.match(upload, /profileJson/)
  assert.match(upload, /Unsupported file type/)
  assert.match(upload, /did not contain any profileable dataset rows/)
  assert.match(upload, /raw_sample_hash/)
  for (const name of ["profileSupabase", "profilePostgres", "profileApi", "profileBigQuery", "profileSnowflake"]) {
    assert.match(connect, new RegExp(name))
  }
  assert.match(connect, /raw_sample_hash/)
})

test("case wizard exposes six steps, persists state, auto-fills summaries, and disables unsafe submit", () => {
  const source = read("app/app/cases/new/page.tsx")
  for (const label of ["Data Source", "Select Dataset", "Classify Issue", "Downstream & Fix", "Candidate Outcomes", "Review & Submit"]) {
    assert.match(source, new RegExp(label.replace("&", "&amp;|&")))
  }
  assert.match(source, /localStorage\.setItem/)
  assert.match(source, /localStorage\.getItem/)
  assert.match(source, /set\("missingness_summary"/)
  assert.match(source, /set\("duplication_summary"/)
  assert.match(source, /const canSubmit/)
  assert.match(source, /disabled=\{loading \|\| !canSubmit\}/)
  assert.match(source, /sampleRowsHash/)
  assert.match(source, /evidenceManifestHash/)
})

test("public contract address display prefers Qualora env alias", () => {
  const health = read("app/api/health/route.ts")
  assert.match(health, /NEXT_PUBLIC_QUALORA_CONTRACT_ADDRESS/)
  assert.match(health, /has_private_key/)
  assert.match(health, /private_key_length/)
  assert.match(health, /private_key_starts_with_0x/)
  assert.match(health, /account_address/)
  assert.match(read("app/app/contract-trace/page.tsx"), /NEXT_PUBLIC_QUALORA_CONTRACT_ADDRESS/)
})
