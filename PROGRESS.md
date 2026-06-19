# Qualora — Build Progress

## Status: Active Development
Last updated: 2026-06-18

---

## What's built and working

### Auth
- [x] Email/password signup
- [x] "Check your email" screen when confirmation is on
- [x] Immediate session flow when confirmation is off (current dev mode)
- [x] Login page
- [x] Forgot password (sends reset link via Brevo SMTP)
- [x] Reset password page — no seed phrase, just set new password
- [x] Auth callback route — wallet + profile created here after confirmation
- [x] Middleware guards all `/app/*` routes

### Embedded Wallet (Managed Model)
- [x] Wallet generated server-side on signup (ethers.js)
- [x] Private key encrypted with AES-256-GCM
- [x] WEK wrapped with PBKDF2(WALLET_MASTER_SECRET:userId) — no user password needed
- [x] Wallet permanently linked to account — survives password reset
- [x] No seed phrase shown to users — managed embedded wallet model
- [x] Wallet creation moved to `/auth/callback` to avoid FK violations

### Database
- [x] Migration SQL written (12 tables + RLS + storage bucket)
- [x] Migration run against Supabase project
- [x] Service role grants applied (`GRANT ALL ON ALL TABLES`)
- [ ] RLS policies for authenticated client reads/writes need one more SQL patch (profiles update currently failing)

### GenLayer Contract
- [x] `QualoraDataQualityOracle` deployed to GenLayer StudioNet
- [x] Contract address: `0x49852638d1A3DA1996380b1e88923439d9713235`
- [x] `submit_case` accepts a 27-parameter data governance packet
- [x] `get_case_summary_card` is the primary read surface for finalized verdict data
- [x] GenLayer non-deterministic validator consensus is used to adjudicate each case
- [x] Leader and validator functions independently assess dataset risk, fix safety, evidence quality, and downstream impact
- [x] Optional public evidence URL access allows validators to inspect supporting evidence during review
- [x] Contract rejects caller-supplied verdict fields so the frontend cannot pre-decide the outcome
- [x] Supabase mirrors case state for UI only; the GenLayer contract remains the canonical verdict source

### Data Source Intake

- [x] Qualora supports both uploaded datasets and connected data sources from the start
- [x] Upload intake supports CSV, Excel, JSON, exported reports, and schema evidence
- [x] Connector intake supports Supabase, PostgreSQL, API endpoints, BigQuery, and Snowflake
- [x] All data sources pass through one shared profiling pipeline
- [x] Qualora profiles datasets off-chain before GenLayer submission
- [x] Private files and evidence are stored in Supabase Storage
- [x] GenLayer receives only structured summaries, evidence hashes, manifest hashes, optional public evidence URLs, and governance metadata
- [x] Full datasets are never uploaded directly to GenLayer
- [x] Supabase mirrors source/profile/case state for UI while GenLayer remains the canonical verdict source

### Frontend — Shell
- [x] Command Ribbon (76px sticky, StudioNet status, open cases count)
- [x] MiniNav sidebar (15 nav items, GenLayer source-of-truth badge)
- [x] Case Docket Drawer (right slide-in, case + verdict preview)
- [x] App layout with onboarding gate

### Frontend — Pages
- [x] Landing page (dark navy, governance graph preview)
- [x] Governance Graph (SVG node graph — datasets → cases → verdicts)
- [x] Command Centre (stats, open cases, recent verdicts, contract activity)
- [x] Onboarding (3 steps: profile → organisation → complete, no seed phrase)
- [x] Datasets list + new dataset form + dataset detail
- [x] Cases list + new case wizard (5 steps) + case detail
- [x] Consensus Chamber (3-column: case facts | validator lanes | verdict seal)
- [x] Verdicts list + verdict detail
- [x] Evidence Vault list + evidence detail
- [x] Contract Trace (full tx log)
- [x] Schema Drift Lab (filtered case view)
- [x] Fix Review Board (pending + reviewed fixes)
- [x] Admin Review page
- [x] Profile & Wallet page
- [x] Settings page

### GenLayer Integration
- [x] `submit_case` route — unwraps managed wallet, signs tx, submits to StudioNet
- [x] `sync_verdict` route — polls receipt, reads `get_case_summary_card`, mirrors to Supabase
- [x] `retry` route — resets stuck case back to open
- [x] Submit button — no password modal (managed wallet signs silently)
- [x] Polling with violet pulse animation while validators deliberate
- [x] Redirect to Consensus Chamber on finalization

### Evidence
- [x] Upload route (multipart, stores in Supabase Storage, SHA-256 hash)
- [x] Hash route
- [x] Evidence included in governance packet sent to contract

### Email (Brevo)
- [x] Brevo SMTP configured in Supabase (smtp-relay.brevo.com:587)
- [x] SMTP key: qualora key active
- [x] IP authorized in Brevo
- [x] Confirmation emails working (rate limited to 2/hr per address in dev)
- [x] "Confirm email" currently OFF for development

---

## Pending / Known Issues

### Immediate (blocking QA)
- [ ] RLS policy patch needed — profiles update fails from browser client
  - Fix: run the 3 SQL policy statements from the last chat message in Supabase SQL editor

### After RLS patch
- [ ] Complete onboarding QA (steps 1 → 2 → 3)
- [ ] Register first dataset
- [ ] Open first governance case
- [ ] Submit case to GenLayer and see verdict in Consensus Chamber

### Before production
- [ ] Re-enable "Confirm email" in Supabase Auth
- [ ] Test full forgot-password → reset → login → wallet intact flow
- [ ] Add Supabase outbound IPs to Brevo authorized list (for production delivery)
- [ ] Set `GENLAYER_CONTRACT_ADDRESS` in production env vars
- [ ] Deploy to Vercel (add all env vars from `.env.local`)

---

## Environment
| Var | Status |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Set |
| `WALLET_MASTER_SECRET` | Set (generated 2026-06-18) |
| `GENLAYER_RPC_URL` | Set (studio.genlayer.com/api) |
| `GENLAYER_CONTRACT_ADDRESS` | Set (0x49852638...) |
| `GENLAYER_CHAIN_ID` | Set (61999) |
| `NEXT_PUBLIC_APP_URL` | Set (http://localhost:3000) |

---

## Architecture decisions made

| Decision | Rationale |
|----------|-----------|
| Managed embedded wallet (no seed phrase) | Email = identity anchor. Wallet recovery = account recovery. Simpler UX, acceptable for governance signing app |
| WEK wrapped with master secret + userId | No user password involved in wallet encryption — survives password resets cleanly |
| Wallet created in `/auth/callback` not signup | Avoids FK violation — user is guaranteed to exist in `auth.users` at callback time |
| GenLayer contract is source of truth | Supabase stores a mirror only. `get_case_summary_card` is the canonical read |
| No seed phrase in onboarding | Replaced with "Your wallet is attached to your account" messaging |
| Brevo for email delivery | Supabase built-in limited to 2/hr per address; Brevo has no such restriction |
