# Qualora Setup Guide

## 1. Run the Supabase migration

Go to your Supabase dashboard → SQL Editor and paste + run the contents of:
`supabase/migrations/0001_qualora_schema.sql`

This creates all 12 tables, RLS policies, and the evidence-files storage bucket.

## 2. Configure Brevo (email OTP)

In Supabase Dashboard → Authentication → Email Settings → SMTP:

- **Host:** smtp-relay.brevo.com
- **Port:** 587
- **Username:** your Brevo login email
- **Password:** your Brevo SMTP key (from Brevo → SMTP & API → SMTP)
- **Sender name:** Qualora
- **Sender email:** noreply@yourdomain.com

No code changes required.

## 3. Deploy the GenLayer Intelligent Contract

1. Install GenLayer CLI: `pip install genlayer`
2. Deploy: `genlayer deploy contracts/QualoraDataQualityOracle.py --network studionet`
3. Copy the contract address returned
4. Set it in `.env.local`: `GENLAYER_CONTRACT_ADDRESS=0x...`
5. (Optional) Also set `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x...` for the contract trace page

Alternatively, deploy via the GenLayer Studio UI at studio.genlayer.com.

## 4. Start the dev server

```
npm run dev
```

Open http://localhost:3000

## 5. First run flow

1. Sign up → wallet is created and encrypted server-side
2. Complete onboarding (profile → workspace → save recovery phrase)
3. Register a dataset
4. Open a governance case
5. Submit to GenLayer (requires wallet password)
6. Wait for validator consensus
7. View verdict in Consensus Chamber

## Notes

- The recovery phrase is shown **once** during onboarding — it must be saved
- Password reset requires the recovery phrase (this is by design — wallet key is wrapped with it)
- GenLayer contract is the authoritative source of truth; Supabase stores a mirror only
- Never commit `.env.local` to version control
