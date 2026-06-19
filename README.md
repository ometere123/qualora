# Qualora — Data Quality Oracle

**Consensus-backed data governance powered by GenLayer Intelligent Contracts.**

Qualora lets data teams classify missingness, duplication, schema drift, and unsafe fixes — and submit them to a GenLayer Intelligent Contract where multiple validators independently reach a binding governance verdict.

---

## What it does

1. **Register a dataset** — connect or upload a data source with schema, profiling stats, and business criticality
2. **Open a governance case** — document the issue type, affected columns, downstream impact, and a proposed fix
3. **Attach evidence** — CSV samples, schema snapshots, and statistical summaries are SHA-256 hashed and anchored
4. **Submit to GenLayer** — the case is sent to `QualoraDataQualityOracle` on StudioNet; validators deliberate independently
5. **Receive a verdict** — consensus outcome is written on-chain: quarantine, approve, approve with warning, or flag for human review
6. **Act on it** — dataset governance status updates automatically; the full reasoning, fix assessment, and required controls are available in the Consensus Chamber

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 App Router (RSC + client components) |
| Database | Supabase (PostgreSQL + RLS + Storage + Realtime) |
| Auth | Supabase Auth (email/password) |
| Blockchain | GenLayer StudioNet (Chain 61999) |
| Contract | `QualoraDataQualityOracle` — Python Intelligent Contract |
| Client lib | `genlayer-js` 1.1.8 |
| Wallet | AES-256-GCM encrypted, server-side managed |
| Email | Brevo SMTP via Supabase |
| Deployment | Vercel |

---

## Contract

- **Address:** `0x49852638d1A3DA1996380b1e88923439d9713235`
- **Network:** GenLayer StudioNet
- **Explorer:** https://explorer-studio.genlayer.com
- **Key functions:** `submit_case`, `get_case_summary_card`, `get_latest_decision`, `has_case`, `get_case_status`
- **Consensus:** Full validator consensus — `leaderOnly` is never used

---

## Key pages

| Route | Description |
|-------|-------------|
| `/app/graph` | Governance Graph — 5-column SVG: Dataset → Case → Evidence → Fix → Verdict |
| `/app/command-centre` | Live stats dashboard with Realtime auto-refresh |
| `/app/cases` | All governance cases — open, pending, verdict received |
| `/app/cases/[id]` | Case detail — facts, evidence, proposed fix, verdict, resubmit CTA |
| `/app/consensus/[id]` | Consensus Chamber — 3-lane validator summary + full verdict detail |
| `/app/verdicts` | All verdicts — click the verdict badge to open detail |
| `/app/evidence` | Evidence Vault — files with "Used in Consensus" badge |
| `/app/contract-trace` | Contract activity log + retry queue for failed submissions |
| `/app/schema-drift` | Filtered view: schema drift cases only |
| `/app/fix-reviews` | Fix proposals pending or reviewed by GenLayer |
| `/app/admin` | Admin console — all users, all cases, failed cases, admin notes |
| `/app/settings` | Profile, notifications, wallet info, security, sign out |

---

## Security principles

- Raw private key never touches the browser
- Wallet encryption key (WEK) is derived from `WALLET_MASTER_SECRET` + `userId` — not the user's password
- Wallet address never changes — password reset rewraps the WEK using the recovery phrase
- Admin role is always read from the `profiles` table server-side — never from the JWT
- Service role client (`createAdminClient`) is server-only — never exposed to the browser
- GenLayer submission uses full validator consensus — contract rejects caller-supplied verdict fields

---

## Setup

See [SETUP.md](./SETUP.md) for the full setup guide including:
- Environment variables
- Supabase migration
- Realtime publication setup
- Admin RLS policy
- Brevo email config
- GenLayer contract deployment

---

## Progress

See [PROGRESS.md](./PROGRESS.md) for a full breakdown of what's built, what's pending, and architecture decisions made.

---

## Live

Deployed at **qualoraa.vercel.app**
