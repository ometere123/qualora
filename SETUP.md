# Qualora Setup Guide

## Prerequisites

- Node.js 18+
- A Supabase project
- A GenLayer StudioNet account (studio.genlayer.com)
- Brevo account (for transactional email)
- Vercel account (for deployment)

---

## 1. Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

WALLET_MASTER_SECRET=your-random-secret-min-32-chars

GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_CONTRACT_ADDRESS=0x708f46749b7faC69768A6E4c18B559415dFEB98e
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x708f46749b7faC69768A6E4c18B559415dFEB98e
GENLAYER_CHAIN_ID=61999

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never commit `.env.local`.

---

## 2. Run the Supabase migration

Go to Supabase Dashboard → SQL Editor and run:
`supabase/migrations/0001_qualora_schema.sql`

This creates all 12 tables, RLS policies, and the evidence-files storage bucket.

---

## 3. Enable Supabase Realtime

Go to Supabase Dashboard → Database → Publications → click `supabase_realtime` and add these tables:
- `genlayer_governance_verdicts`
- `governance_cases`

This powers the live verdict toast notifications and Command Centre auto-refresh.

---

## 4. Admin notes RLS policy

Run this in the Supabase SQL Editor to allow admins to write notes:

```sql
CREATE POLICY "Admins can insert notes"
ON admin_review_notes
FOR INSERT
TO authenticated
WITH CHECK (
  admin_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

---

## 5. Grant admin to a user

Run this in the Supabase SQL Editor (replace the email):

```sql
UPDATE profiles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'your@email.com'
);
```

Or use the script: `node scripts/make-admin.mjs your@email.com`

---

## 6. Configure Brevo (transactional email)

In Supabase Dashboard → Authentication → Email Settings → SMTP:

- **Host:** smtp-relay.brevo.com
- **Port:** 587
- **Username:** your Brevo login email
- **Password:** your Brevo SMTP key
- **Sender name:** Qualora
- **Sender email:** noreply@yourdomain.com

---

## 7. GenLayer contract

The contract is already deployed at `0x708f46749b7faC69768A6E4c18B559415dFEB98e` on StudioNet.

To redeploy:
1. `pip install genlayer`
2. `genlayer deploy contracts/QualoraDataQualityOracle.py --network studionet`
3. Update `GENLAYER_CONTRACT_ADDRESS` in env vars

---

## 8. Start the dev server

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## 9. First run flow

1. Sign up → wallet is created and encrypted server-side
2. Complete onboarding (profile → organisation → done)
3. Register a dataset
4. Open a governance case with affected columns, downstream impact, proposed fix
5. Attach evidence files
6. Submit to GenLayer — validators deliberate and reach consensus
7. Receive verdict in Consensus Chamber (Realtime toast fires automatically)
8. Dataset governance status auto-updates on quarantine/approve verdicts

---

## Notes

- Recovery phrase is shown once at signup — must be saved
- Password reset uses the recovery phrase to rewrap the wallet key — wallet address never changes
- GenLayer contract is the authoritative source of truth; Supabase stores a mirror only
- Admin role is always read from the `profiles` table server-side — never from the JWT
- Raw private key never leaves the server — only the recovery phrase is the user's backup
