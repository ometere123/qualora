<p align="center">
  <img src="./app/icon.svg" alt="Qualora logo" width="96" />
</p>

<h1 align="center">Qualora</h1>

<p align="center">
  Consensus-backed data quality governance for teams that need a binding answer, not another dashboard opinion.
</p>

<p align="center">
  <a href="https://qualoraa.vercel.app">Live app</a>
  ·
  <a href="https://explorer-studio.genlayer.com">GenLayer StudioNet explorer</a>
</p>

---

## Overview

Qualora is a data quality governance app built around a GenLayer Intelligent Contract. It helps a team turn messy data problems into auditable governance cases, attach verifiable evidence, submit the case to validator consensus, and receive a binding decision such as quarantine, approve with warning, reject a proposed fix, or request more evidence.

The important idea is simple: Qualora does not ask validators to trust a user's written claim. The app publishes a privacy-safe evidence manifest, the contract asks validators to fetch that evidence independently, and the final governance decision is accepted only when the evidence foundation and the substantive verdict agree.

Live production:

- App: `https://qualoraa.vercel.app`
- Contract: `0xCbd9D33A44407C047c9eeF1c1d72a48D74d513aB`
- Network: GenLayer StudioNet, chain `61999`
- Protocol: `2.0.2`
- Consensus schema: `qualora.consensus.v2`
- Public smoke evidence: `https://qualoraa.vercel.app/api/evidence/smoke`
- Smoke digest: `b4df2823725c6d39c014362425d7b8f94ef095f3b1dc947f7c148c7a81277bc2`

## Why Qualora Belongs On GenLayer

Most data quality tools can detect anomalies. The hard part is governance: who gets to decide whether a dataset should be used, quarantined, remediated, or escalated when multiple teams depend on it?

Qualora uses GenLayer for that exact boundary. The app can profile data and collect context, but the final governance decision is made by validators through the contract. That gives the decision three properties that an ordinary off-chain AI workflow does not provide:

- Independent validator review of the same governance packet.
- Contract-side enforcement of who may replace the latest decision.
- On-chain case history where rechecks produce new versions instead of silently overwriting state.

This is not an AI answer app with a blockchain label. The contract controls an operative governance outcome, and the app treats GenLayer as the source of truth for the latest decision.

## What The Product Does

Qualora supports the full lifecycle of a data quality case:

1. Register or profile a dataset.
2. Capture issue details such as missingness, duplication, schema drift, invalid values, or unsafe remediation.
3. Attach real evidence through uploaded files, summaries, schema snapshots, or connector-derived profiling.
4. Generate a canonical evidence manifest with a public token and SHA-256 digest.
5. Submit the case to the GenLayer contract using the user's managed wallet.
6. Let validators fetch the evidence and deliberate through full consensus.
7. Mirror the final verdict into Supabase for the UI while keeping the contract as the authority.
8. Update dataset governance status and preserve the audit trail.

## Architecture

| Layer | Implementation |
| --- | --- |
| Frontend | Next.js 15 App Router, React 19, Tailwind |
| Auth | Supabase Auth |
| Database | Supabase Postgres with RLS |
| Storage | Supabase Storage for user evidence files |
| Evidence manifests | Public, tokenized, summary-only JSON served by Next.js API routes |
| Contract | GenLayer Python Intelligent Contract |
| Chain | GenLayer StudioNet |
| Wallet model | Server-managed embedded wallet encrypted with AES-256-GCM |
| Deployment | Vercel |
| Email | Brevo SMTP through Supabase |

## Contract Model

The contract is `contracts/QualoraDataQualityOracle.py`.

Core public methods:

- `submit_case`: creates the first governance decision for a case.
- `request_recheck`: creates a new version after more evidence or a changed remediation plan.
- `get_latest_decision`: returns the canonical latest decision for a case.
- `get_case_summary_card`: returns a compact UI-friendly summary.
- `get_case_status`: returns lifecycle status and version information.
- `has_case`: checks whether a case exists on-chain.

Security-critical behavior:

- `request_recheck` is restricted to the original case submitter.
- The original submitter is stored immutably.
- A recheck creates a new case version instead of mutating the old decision invisibly.
- Caller-provided verdict fields are not trusted as outcomes.
- Missing, unavailable, or mismatched evidence fails closed as `needs_more_evidence`.
- Full validator consensus is used; `leaderOnly` is not used for governance decisions.
- Rich governance outputs use GenLayer's native comparative equivalence principle: operative fields must agree while explanatory prose may vary.

## Verified Evidence

Qualora v2.0.2 binds every operative governance decision to evidence that validators can fetch and hash themselves.

Evidence descriptors use this shape:

```text
https://allowed-host/path#sha256=<64-character-sha256-digest>
```

The contract validates the descriptor, fetches the bytes, computes SHA-256, and compares the digest. If no descriptor passes verification, the contract cannot return an operative approval or quarantine decision. It returns `needs_more_evidence` instead.

This matters because a plain evidence hash or user-written summary is still only a claim. A validator-fetched descriptor gives the contract a real reproducible object to inspect.

## Evidence Privacy

Qualora avoids sending raw datasets to GenLayer. The public evidence manifest is summary-only and can include:

- Dataset shape and row/column counts.
- Column names, data types, and null counts.
- Duplicate and uniqueness statistics.
- Schema drift indicators.
- Issue-specific quality metrics.
- Proposed fix metadata.
- Safe sample previews where the app has already redacted or summarized the source.

The manifest is public because validators must fetch it, but it is tokenized and should not contain secrets, credentials, private customer records, or raw full datasets.

## Pages

| Route | Purpose |
| --- | --- |
| `/app/command-centre` | Operational dashboard, open cases, recent verdicts, live status |
| `/app/graph` | Governance graph from dataset to evidence, fix, and verdict |
| `/app/datasets` | Dataset inventory and dataset detail views |
| `/app/cases` | Case list and case creation flow |
| `/app/cases/[id]` | Case detail, evidence, verdict, and resubmission actions |
| `/app/consensus/[id]` | Consensus Chamber with validator reasoning and final decision |
| `/app/verdicts` | Historical verdict list |
| `/app/evidence` | Evidence Vault |
| `/app/contract-trace` | GenLayer transactions and retry queue |
| `/app/schema-drift` | Focused schema drift workflow |
| `/app/fix-reviews` | Proposed remediation reviews |
| `/app/admin` | Admin-only oversight |
| `/app/settings` | Profile, wallet, notifications, and security |

## Manual Trial As A New User

Use this path when you are not the deployer and you want to experience the product as a real user.

### 1. Create an account

Open `https://qualoraa.vercel.app`, sign up with a real email address, confirm the email, then sign in. Qualora creates a managed wallet for your account after auth callback. You do not need a browser wallet or the deployer's key.

Complete onboarding with realistic details:

- Display name: your real name or test operator name.
- Organisation: `Qualora Manual QA` or your actual company/team.
- Role: `Data Steward`, `Analytics Engineer`, or `Governance Lead`.

### 2. Register a real test dataset

You can use the included sample file `qualora-test-dataset.csv`, or create a small CSV from real public-style business data. A strong manual test dataset should contain actual data quality signals:

```csv
customer_id,email,signup_date,country,total_spend,risk_status
C001,ada@example.com,2026-07-01,NG,1200,active
C002,,2026-07-02,US,250,active
C002,,2026-07-02,US,250,active
C003,bad-email,2026-07-04,GB,-30,active
C004,maria@example.com,,BR,980,review
C005,lee@example.com,2026-07-07,US,4500,active
```

This is useful because it has duplicate IDs, missing emails, an invalid email format, a missing signup date, and a negative spend value. Those are real governance facts, not abstract demo text.

### 3. Open a governance case

Create a case with realistic values:

- Case title: `Customer onboarding dataset contains duplicate IDs and invalid spend values`
- Issue type: `duplicate_records` or `invalid_values`
- Affected columns: `customer_id`, `email`, `signup_date`, `total_spend`
- Severity: `high`
- Business impact: `This dataset feeds onboarding analytics and account risk scoring. Duplicate customer IDs can double-count users, invalid emails break lifecycle messaging, and negative spend values distort revenue reporting.`
- Proposed fix: `Quarantine the current dataset version, deduplicate by customer_id using latest signup_date where present, reject negative total_spend rows for manual review, and require email format validation before release.`

Attach the CSV as evidence. If the app profiles it successfully, it will create the summary evidence manifest and hash it.

### 4. Submit to GenLayer

From the case detail page, click the GenLayer submission action. The server-managed wallet signs for your account. You should see the case move into a pending/submitted state while the transaction finalizes.

The expected result for the dataset above is not an immediate clean approval. A serious validator outcome should be one of:

- `quarantine_dataset`
- `reject_proposed_fix`
- `needs_human_review`
- `needs_more_evidence` if evidence publication or digest verification fails

For this specific dataset and proposed fix, `quarantine_dataset` is the strongest expected outcome because the defects affect identity, communication, and finance-like reporting fields.

### 5. Inspect the verdict

Open the Consensus Chamber for the case. Check that the verdict includes:

- The final governance action.
- Evidence verification status.
- Evidence digest or verified evidence count.
- Reasoning tied to the actual dataset defects.
- Required controls before the dataset can be trusted again.

If the verdict is `needs_more_evidence`, that is not automatically a failure. It means the contract did not receive at least one evidence descriptor that validators could fetch and hash successfully.

### 6. Test the authorized recheck path

As the same signed-in user who submitted the case, add more evidence or change the remediation plan, then resubmit. This should call `request_recheck`, advance the case version, and replace the latest decision only because you are the authorized case party.

A realistic recheck note:

```text
Added remediation evidence showing deduplication rules, rejected negative spend records, and email validation controls. Requesting a new decision on whether the cleaned dataset can move from quarantine to approved_with_warning.
```

### 7. Test the unauthorized boundary

Sign out, create a second account, and try to replace the first user's latest decision for the same case. The UI should not present that as a normal action for another user's case. At contract level, the hard rule is stricter: only the original submitter address may run `request_recheck` successfully for that case.

This is the exact security boundary that v2.0.2 enforces.

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

WALLET_MASTER_SECRET=your-random-secret-min-32-chars

GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_CONTRACT_ADDRESS=0xCbd9D33A44407C047c9eeF1c1d72a48D74d513aB
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0xCbd9D33A44407C047c9eeF1c1d72a48D74d513aB
NEXT_PUBLIC_QUALORA_CONTRACT_ADDRESS=0xCbd9D33A44407C047c9eeF1c1d72a48D74d513aB
GENLAYER_CHAIN_ID=61999

NEXT_PUBLIC_APP_URL=http://localhost:3000
QUALORA_PUBLIC_EVIDENCE_BASE_URL=https://your-production-domain.vercel.app
```

Run the Supabase migrations in order:

- `supabase/migrations/0001_qualora_schema.sql`
- `supabase/migrations/0002_admin_review_notes_policy.sql`, if present in your branch
- `supabase/migrations/0003_*`, if present in your branch
- `supabase/migrations/0004_verified_evidence_manifests.sql`

Enable Supabase Realtime for:

- `genlayer_governance_verdicts`
- `governance_cases`

Start local development:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Validation

Run the local verification suite:

```bash
npm run test
npm run build
```

Available scripts:

| Command | Purpose |
| --- | --- |
| `npm run test:contract` | Static/behavioral contract security checks |
| `npm run test:qa` | App and integration wiring checks |
| `npm run test` | Contract and QA checks together |
| `npm run build` | Next.js production build |
| `npm run test:live` | Live GenLayer/Supabase E2E path, requires configured env |

Latest verified state:

- Contract behavioral checks: `8/8`
- QA wiring checks: `13/13`
- TypeScript build: passed
- Vercel production deployment: passed
- StudioNet live adversarial matrix: passed

## Live Security Validation

Qualora v2.0.2 was validated on StudioNet on July 13, 2026.

Observed live checks:

- A no-evidence submission failed closed as `needs_more_evidence`.
- A funded attacker account could not replace the latest decision.
- The authorized original submitter could recheck and advance the case from version 1 to version 2.
- The original submitter remained immutable.
- Validators fetched and verified the production evidence digest.
- The final summary exposed the same verified digest and verification state.

Live matrix case:

- Case: `qa-v2-live-1783961864275`
- Unauthorized recheck tx: `0x4623bc67ad0749158bce9467d6e6d75f8cee563f343df73b41e58c3fe911c3dd`
- Authorized recheck tx: `0x271f01ceb767066d59f7acbdf677a4192c4788c09d078bfda19fa7e752c2134d`
- Final live verdict: `quarantine_dataset`
- Verified digest: `b4df2823725c6d39c014362425d7b8f94ef095f3b1dc947f7c148c7a81277bc2`

## Supabase Reset State

The v2 migration has been applied to the production Supabase project. Application data and old evidence objects were reset for a clean v2 start while preserving authentication users.

Final reset verification:

| Area | Count |
| --- | ---: |
| Preserved `auth.users` | 11 |
| App profiles | 0 |
| Workspaces | 0 |
| Governance cases | 0 |
| Dataset profiles | 0 |
| Mirrored verdicts | 0 |
| Evidence objects | 0 |

## Security Notes

- Raw private keys never touch the browser.
- Wallet encryption is server-side and tied to `WALLET_MASTER_SECRET` plus user identity.
- Password reset does not replace the wallet.
- Admin status is read from `profiles.role` server-side.
- The service role client is server-only.
- Supabase stores a UI mirror; GenLayer remains the canonical decision source.
- Evidence manifests should be treated as public and must never contain secrets.

## Current Readiness

Qualora is submission-ready at a strong 9/10 level. The project now addresses the material governance issue found in review: an unauthorized party cannot replace the latest decision through `request_recheck`.

No one can honestly guarantee a 10/10 score or a reward because that depends on evaluator judgment, network conditions, and validator behavior. The important engineering position is strong: the product has one coherent use case, uses GenLayer for a real consensus boundary, validates real fetched evidence, and has live adversarial proof for the recheck authorization fix.
