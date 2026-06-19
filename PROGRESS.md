# Qualora — Build Progress

## Status: Feature Complete
Last updated: 2026-06-19

---

## What's built and working

### Auth
- [x] Email/password signup
- [x] Login page
- [x] Forgot password (sends reset link via Brevo SMTP)
- [x] Reset password page — rewraps wallet encryption key, no wallet replacement
- [x] Auth callback route — wallet + profile created here after confirmation
- [x] Middleware guards all `/app/*` routes

### Embedded Wallet (Managed Model)
- [x] Wallet generated server-side on signup (ethers.js)
- [x] Private key encrypted with AES-256-GCM
- [x] WEK wrapped with PBKDF2(WALLET_MASTER_SECRET:userId) — no user password needed
- [x] Wallet permanently linked to account — survives password reset
- [x] Recovery phrase shown once at signup (12 words), stored encrypted
- [x] Password reset rewraps WEK using recovery phrase — wallet address never changes

### Database
- [x] 12 tables + RLS + storage bucket migration applied
- [x] Service role grants applied
- [x] RLS policies for authenticated client reads/writes in place
- [x] Admin role stored in `profiles.role`, read server-side (never from stale JWT)
- [x] `admin_review_notes` RLS policy: insert allowed for authenticated admins only

### GenLayer Contract
- [x] `QualoraDataQualityOracle` deployed to GenLayer StudioNet
- [x] Contract address: `0x708f46749b7faC69768A6E4c18B559415dFEB98e`
- [x] `submit_case` accepts a 27-parameter data governance packet
- [x] Full validator consensus — `leaderOnly` is never used
- [x] `get_case_summary_card` + `get_latest_decision` are the canonical read surfaces
- [x] Contract rejects caller-supplied verdict fields — frontend cannot pre-decide outcome
- [x] Supabase mirrors case state for UI only; GenLayer contract is the source of truth

### Data Source Intake
- [x] Upload intake: CSV, Excel, JSON, schema evidence
- [x] Connector intake: Supabase, PostgreSQL, API, BigQuery, Snowflake
- [x] All data sources pass through shared profiling pipeline
- [x] GenLayer receives only structured summaries, evidence hashes, and governance metadata
- [x] Full datasets are never uploaded to GenLayer

### Frontend — Shell
- [x] Command Ribbon (sticky, StudioNet status badge, open cases count, search)
- [x] MiniNav sidebar (all nav items, admin item shown only to admins, GenLayer badge)
- [x] MobileDock (bottom nav bar, 5 core items, safe-area aware)
- [x] Case Docket Drawer (right slide-in from graph double-click or ribbon)
- [x] App layout with onboarding gate
- [x] VerdictNotifier — Supabase Realtime toast when a new verdict arrives (app-wide)

### Frontend — Pages
- [x] **Landing page** — hero, problem section, GenLayer adjudication flow, use cases, demo verdict, CTA
- [x] **Governance Graph** — 5-column SVG: Dataset → Case → Evidence → Fix Proposal → Verdict; double-click case opens docket drawer
- [x] **Command Centre** — stats, open cases, recent verdicts, contract activity; Supabase Realtime auto-refresh
- [x] **Onboarding** — 3 steps: profile → organisation → complete
- [x] **Datasets** — list + new dataset form + dataset detail
- [x] **Cases** — list + new case wizard (5 steps) + case detail; `needs_more_evidence` banner with resubmit CTA
- [x] **Consensus Chamber** — 3-lane validator summary (Case / Validator Analysis / Binding Consensus) + full verdict detail grid
- [x] **Verdicts** — list (verdict badge links to `/verdicts/[id]`) + verdict detail
- [x] **Evidence Vault** — list with "Used in Consensus" badge + evidence detail; fixed join (no `title` column)
- [x] **Contract Trace** — full tx log with retry queue for `genlayer_failed` cases; admin sees all, user sees own
- [x] **Schema Drift Lab** — filtered to `schema_drift` issue type, renders `schema_drift_summary`
- [x] **Fix Review Board** — pending and reviewed fixes, reads `fix_assessment` and `dataset_action` from verdict
- [x] **Admin Console** — stats (users/cases/verdicts/failed), all-cases table, all-users table, failed cases list, admin notes with add form
- [x] **Profile & Wallet** — wallet address, recovery phrase status
- [x] **Settings** — profile edit, notifications section, embedded wallet section, security, sign out

### GenLayer Integration
- [x] `submit-case` route — unwraps managed wallet, signs tx, polls for finalized receipt
- [x] On `needs_more_evidence` verdict — case status resets to `evidence_attached` for resubmission
- [x] On `quarantine_dataset` / `approved` / `approved_with_warning` — `datasets.governance_status` auto-updated
- [x] Tx hashes link to `explorer-studio.genlayer.com/tx/[hash]`
- [x] Retry queue in Contract Trace for any `genlayer_failed` cases

### Evidence
- [x] Upload route (multipart, Supabase Storage, SHA-256 hash)
- [x] Evidence included in governance packet
- [x] "Used in Consensus" badge in Evidence Vault when case has a verdict

### Notifications (Realtime)
- [x] Supabase Realtime enabled on `genlayer_governance_verdicts` and `governance_cases`
- [x] Toast notification fires on verdict INSERT (any page in the app)
- [x] Command Centre stats auto-refresh on case/verdict changes

### Admin
- [x] Role checked from `profiles.role` server-side — JWT staleness not an issue
- [x] Admin sees all cases and verdicts (service role client)
- [x] Admin console: cross-user cases table, failed cases, user list, admin notes
- [x] Admin notes: read existing + add new from UI

### Email (Brevo)
- [x] Brevo SMTP configured in Supabase
- [x] Confirmation and password reset emails working

---

## Known Gaps / Future Work

- Notifications: email/push (only in-app Realtime toast implemented)
- Private key export: intentionally not implemented (recovery phrase is the backup mechanism)
- GovernanceGraph: evidence and fix nodes are shown but are not individually clickable (only case nodes open the docket)
- Validator individual votes: not exposed by the contract's public read functions — only consensus outcome is shown

---

## Environment
| Var | Status |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Set |
| `WALLET_MASTER_SECRET` | Set |
| `GENLAYER_RPC_URL` | Set (studio.genlayer.com/api) |
| `GENLAYER_CONTRACT_ADDRESS` | Set (0x49852638...) |
| `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` | Set |
| `GENLAYER_CHAIN_ID` | Set (61999) |
| `NEXT_PUBLIC_APP_URL` | Set (qualoraa.vercel.app) |

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Managed embedded wallet (no seed phrase at login) | Email = identity anchor. Simpler UX for a governance signing app |
| WEK wrapped with master secret + userId | Wallet survives password resets cleanly — no user password in the key derivation |
| Wallet created in `/auth/callback` | Avoids FK violation — user guaranteed to exist in `auth.users` at callback time |
| GenLayer contract is source of truth | Supabase stores a mirror only. `get_case_summary_card` is the canonical verdict read |
| Full validator consensus (no leaderOnly) | Ensures genuine multi-validator adjudication on every case |
| Admin role from `profiles` table, not JWT | JWT can be stale after role grant — DB read is always current |
| Brevo for email delivery | Supabase built-in rate-limited to 2/hr per address; Brevo has no such restriction |
