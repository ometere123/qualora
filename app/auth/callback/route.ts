import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createWalletBundle } from "@/lib/wallet/create"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/app/onboarding"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const user = data.user
      const masterSecret = process.env.WALLET_MASTER_SECRET!
      const admin = createAdminClient()

      // Ensure profile + wallet exist  -  idempotent, safe to call multiple times
      const { data: existingWallet } = await admin
        .from("wallets").select("id").eq("user_id", user.id).single()

      if (!existingWallet) {
        const bundle = createWalletBundle(user.id, masterSecret)

        await admin.from("profiles").upsert({
          user_id: user.id,
          email: user.email!,
          display_name: null,
          role: "user",
          onboarding_completed: false,
        }, { onConflict: "user_id", ignoreDuplicates: true })

        const { data: walletRow } = await admin.from("wallets").insert({
          user_id: user.id,
          address: bundle.address,
          encrypted_private_key: bundle.encryptedPrivateKey,
          encryption_version: bundle.encryptionVersion,
        }).select("id").single()

        if (walletRow) {
          await admin.from("wallet_key_wraps").insert({
            wallet_id: walletRow.id,
            user_id: user.id,
            method: "managed",
            encrypted_wallet_key: bundle.managedWrap.encryptedWalletKey,
            salt: bundle.managedWrap.salt,
            kdf_params: bundle.managedWrap.kdfParams,
          })
        }
      }

      // Check onboarding status
      const { data: profile } = await admin
        .from("profiles").select("onboarding_completed").eq("user_id", user.id).single()

      const destination = profile?.onboarding_completed ? "/app/graph" : "/app/onboarding"
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
