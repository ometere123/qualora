import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createWalletBundle } from "@/lib/wallet/create"

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json()
    if (!userId || !email) {
      return NextResponse.json({ error: "userId and email are required" }, { status: 400 })
    }

    const masterSecret = process.env.WALLET_MASTER_SECRET
    if (!masterSecret) {
      return NextResponse.json({ error: "Server misconfiguration: WALLET_MASTER_SECRET not set" }, { status: 500 })
    }

    const admin = createAdminClient()

    // Idempotent — skip if wallet already exists for this user
    const { data: existing } = await admin.from("wallets").select("id, address").eq("user_id", userId).single()
    if (existing) {
      return NextResponse.json({ ok: true, address: existing.address })
    }

    const bundle = createWalletBundle(userId, masterSecret)

    // 1. Upsert profile — safe if it already exists
    const { error: profileError } = await admin.from("profiles").upsert({
      user_id: userId,
      email,
      display_name: null,
      role: "user",
      onboarding_completed: false,
    }, { onConflict: "user_id", ignoreDuplicates: true })
    if (profileError) throw profileError

    // 2. Insert wallet
    const { data: walletRow, error: walletError } = await admin
      .from("wallets")
      .insert({
        user_id: userId,
        address: bundle.address,
        encrypted_private_key: bundle.encryptedPrivateKey,
        encryption_version: bundle.encryptionVersion,
      })
      .select("id")
      .single()
    if (walletError) throw walletError

    // 3. Insert managed wrap — the only wrap, keyed to server master secret
    const { error: wrapError } = await admin.from("wallet_key_wraps").insert({
      wallet_id: walletRow.id,
      user_id: userId,
      method: "managed",
      encrypted_wallet_key: bundle.managedWrap.encryptedWalletKey,
      salt: bundle.managedWrap.salt,
      kdf_params: bundle.managedWrap.kdfParams,
    })
    if (wrapError) throw wrapError

    return NextResponse.json({ ok: true, address: bundle.address })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error("[wallet/create]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
