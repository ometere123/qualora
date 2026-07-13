# Response To GenLayer Review

## Review Received

**More information requested**

Thanks for the submission. Before this can be credited, restrict `request_recheck` so only an authorized case party can replace the latest governance decision.

Requested by Gen. Dave on July 12, 2026 at 23:48.

## Response

Implemented and verified.

`request_recheck` is now restricted to the original case submitter recorded on-chain when the case is first created. The original submitter is immutable, and only that address can replace the latest governance decision by creating a new case version.

This means a second wallet, another app user, or any unrelated funded account cannot replace the current decision for someone else's case. A recheck is still allowed for the authorized party, but it advances the case version and preserves the audit trail instead of silently overwriting history.

## What Changed

Contract:

- Stores the original case submitter on initial `submit_case`.
- Checks `gl.message.sender_address` inside `request_recheck`.
- Rejects rechecks from any address that does not match the original submitter.
- Preserves the original submitter across future versions.
- Keeps the old decision history while making the newest authorized version the latest decision.

App:

- Uses the user's server-managed wallet for submission and recheck actions.
- Mirrors GenLayer verdicts into Supabase for UI display only.
- Keeps GenLayer as the source of truth.

Evidence:

- Operative verdicts now require validator-fetched evidence descriptors.
- Evidence descriptors include a public HTTPS URL and SHA-256 digest.
- If validators cannot fetch and verify evidence bytes, the contract fails closed with `needs_more_evidence`.

## Final Contract

- Contract address: `0xa45FD2E0A4a4858279872454fa592Aee1FAB87e1`
- Network: GenLayer StudioNet
- Chain ID: `61999`
- Protocol: `2.0.2`
- Deployment transaction: `0x20e64f66c6551a54516668e002233758ba641b29187eae2e8da890ad7a776f1a`
- Production app: `https://qualoraa.vercel.app`

## Live Verification

The authorization fix was tested live with two wallets:

| Test | Result |
| --- | --- |
| Original user submits a case | Passed |
| Case receives an initial governance decision | Passed |
| Funded second wallet attempts `request_recheck` | Blocked; latest decision and version remained unchanged |
| Original submitter runs `request_recheck` | Passed; case advanced from version 1 to version 2 |
| Original submitter identity remains unchanged | Passed |

Live transaction references:

- Test case: `qa-v2-live-1783961864275`
- Unauthorized recheck tx: `0x4623bc67ad0749158bce9467d6e6d75f8cee563f343df73b41e58c3fe911c3dd`
- Authorized recheck tx: `0x271f01ceb767066d59f7acbdf677a4192c4788c09d078bfda19fa7e752c2134d`
- Final verdict: `quarantine_dataset`

## Manual Real-Life Usage Test

Use this section exactly if you are trying the site as a new user and not as the deployer.

### 1. Sign up

Open `https://qualoraa.vercel.app`.

Create an account with a real email address, confirm the email, and sign in. You do not need the deployer's key. Qualora creates a managed wallet for your account after signup.

Use realistic onboarding details:

- Name: your actual test operator name.
- Organisation: `Qualora Manual QA` or your own team name.
- Role: `Data Steward`, `Analytics Engineer`, or `Governance Lead`.

### 2. Prepare real test evidence

Use a CSV with clear data quality problems. You can use this exact file content for a manual test:

```csv
customer_id,email,signup_date,country,total_spend,risk_status
C001,ada@example.com,2026-07-01,NG,1200,active
C002,,2026-07-02,US,250,active
C002,,2026-07-02,US,250,active
C003,bad-email,2026-07-04,GB,-30,active
C004,maria@example.com,,BR,980,review
C005,lee@example.com,2026-07-07,US,4500,active
```

This is good test evidence because it contains real governance issues:

- Duplicate customer ID: `C002`
- Missing email values
- Invalid email format: `bad-email`
- Missing signup date
- Negative spend value: `-30`

### 3. Create a dataset

Go to the app and create a dataset.

Suggested values:

- Dataset name: `Customer Onboarding Quality Review`
- Owner: `Data Governance`
- Business criticality: `High`
- Description: `Customer onboarding data used for lifecycle messaging, revenue reporting, and account risk review.`

Upload the CSV as the evidence source or use the case creation flow that profiles the uploaded file.

### 4. Open a governance case

Create a new case with these details:

- Case title: `Customer onboarding dataset contains duplicate IDs and invalid spend values`
- Issue type: `duplicate_records` or `invalid_values`
- Severity: `high`
- Affected columns: `customer_id`, `email`, `signup_date`, `total_spend`
- Business impact: `This dataset feeds onboarding analytics and account risk scoring. Duplicate customer IDs can double-count users, invalid emails break lifecycle messaging, and negative spend values distort revenue reporting.`
- Proposed fix: `Quarantine the current dataset version, deduplicate by customer_id using the latest signup_date where present, reject negative total_spend rows for manual review, and require email format validation before release.`

Attach the CSV evidence and continue until the case is ready to submit.

### 5. Submit to GenLayer

Click the GenLayer submit action from the case page.

Expected behavior:

- Your managed wallet signs the request.
- The case enters a pending/submitted state.
- Validators review the case and fetched evidence.
- A verdict appears in the Consensus Chamber once finalized.

Expected strong outcome for this evidence:

- `quarantine_dataset`

Acceptable outcomes depending on validator interpretation:

- `reject_proposed_fix`, if the remediation is judged incomplete.
- `needs_human_review`, if the validator wants manual approval before release.
- `needs_more_evidence`, if the evidence URL or digest cannot be verified.

An immediate clean `approved` verdict would be suspicious for this dataset because the evidence contains duplicate identity records and invalid financial-style values.

### 6. Review the Consensus Chamber

Open the case verdict and check that the decision references actual evidence from the dataset.

The important things to verify:

- It discusses duplicate customer IDs or invalid values.
- It does not merely say the response is valid JSON.
- It shows evidence verification or a verified evidence count.
- It gives a governance action, not just advice.
- It explains what must happen before the dataset can be trusted.

### 7. Run an authorized recheck

Stay signed in as the same user who created the case.

Add stronger remediation evidence or update the proposed fix. Example recheck note:

```text
Added remediation evidence showing deduplication rules, rejected negative spend records, and email validation controls. Requesting a new decision on whether the cleaned dataset can move from quarantine to approved_with_warning.
```

Submit the recheck.

Expected behavior:

- The recheck succeeds because you are the original authorized case party.
- The case version increments.
- The latest decision updates to the new authorized version.
- The original submitter remains the same.

### 8. Confirm the unauthorized path is blocked

Sign out and create a second account.

As that second account, you should not be able to replace the first user's latest case decision through the normal UI. At contract level, even if a second funded wallet attempts the method directly, `request_recheck` is restricted to the original submitter address.

This confirms the review request is addressed.

## Final Position

This review item is fixed, deployed, and tested on StudioNet. The project is ready for resubmission with the new contract address and the manual usage flow above.
