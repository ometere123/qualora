import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { test } from "node:test"

const ROOT = process.cwd()
const NEW_ADDRESS = "0xa45FD2E0A4a4858279872454fa592Aee1FAB87e1"
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
  const submitCall = source.indexOf('functionName: "submit_case"')
  assert.notEqual(submitCall, -1, "submit route must call submit_case")
  const start = source.indexOf("args: [", submitCall)
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
  assert.match(submit, /predates verified evidence manifests/)
  assert.doesNotMatch(submit, /csvText|rawCsv|rawJson|fileBody|uploaded file body/i)
  assert.doesNotMatch(packet, /rows\.slice|raw CSV|raw JSON|file body/i)
  assert.match(packet, /assertCandidateOutcomesSafe/)
  assert.match(packet, /#sha256=/)
  assert.match(packet, /allowed HTTPS host/)
  assert.match(submit, /canonicalEvidenceDescriptor/)
  assert.match(submit, /evidence_public_token/)
  assert.match(submit, /QUALORA_PUBLIC_EVIDENCE_BASE_URL/)
})

test("verified evidence manifests are canonical, public, and deployment-scoped", () => {
  const profiler = read("lib/datasources/profiler.ts")
  const endpoint = read("app/api/evidence/manifests/[token]/route.ts")
  const migration = read("supabase/migrations/0004_verified_evidence_manifests.sql")
  const submit = read("app/api/genlayer/submit-case/route.ts")
  const sync = read("app/api/genlayer/sync-verdict/route.ts")

  assert.match(profiler, /evidence_manifest_json = JSON\.stringify/)
  assert.match(profiler, /evidence_manifest_hash = sha256\(evidence_manifest_json\)/)
  assert.match(endpoint, /evidence_public_token/)
  assert.match(endpoint, /Cache-Control.*immutable/)
  assert.match(migration, /evidence_manifest_json text/)
  assert.match(migration, /evidence_public_token uuid not null default gen_random_uuid\(\)/)
  assert.match(migration, /contract_address, governance_case_id/)
  assert.match(submit, /\.eq\("contract_address", contractAddress\)/)
  assert.match(sync, /onConflict: "contract_address,governance_case_id"/)
})

test("contract binds fetched bytes to SHA-256 and fails closed without verified evidence", () => {
  const source = read("contracts/QualoraDataQualityOracle.py")
  assert.match(source, /hashlib\.sha256\(value\)\.hexdigest\(\)/)
  assert.match(source, /actual_digest == expected_digest/)
  assert.match(source, /def _apply_evidence_policy/)
  assert.match(source, /decision\["verdict"\] = VERDICT_MORE_EVIDENCE/)
  assert.match(source, /leader_verdict != validator_verdict/)
  assert.doesNotMatch(source, /leader_class != validator_class/)
})

test("request_recheck is restricted to the original case submitter", () => {
  const source = read("contracts/QualoraDataQualityOracle.py")
  assert.match(source, /def _require_case_submitter\(self, case_id: str\):/)
  assert.match(source, /gl\.message\.sender_address != submitter/)

  const recheckStart = source.indexOf("def request_recheck(")
  const coreStart = source.indexOf("def _submit_case_internal(", recheckStart)
  const recheck = source.slice(recheckStart, coreStart)
  assert.match(recheck, /if case_id not in self\.case_exists:/)
  assert.match(recheck, /self\._require_case_submitter\(case_id\)/)
  assert.ok(
    recheck.indexOf("self._require_case_submitter(case_id)") < recheck.indexOf("self._submit_case_internal("),
    "authorization must run before re-adjudication can replace the latest decision"
  )

  assert.match(source, /if not exists:\s+self\.case_submitters\[case_id\] = gl\.message\.sender_address/)
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

test("production evidence smoke route is immutable and fact-bearing", () => {
  const source = read("app/api/evidence/smoke/route.ts")
  assert.match(source, /qualora\.evidence-smoke\.v1/)
  assert.match(source, /blank_customer_email_rows: 4/)
  assert.match(source, /immutable, no-transform/)
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
