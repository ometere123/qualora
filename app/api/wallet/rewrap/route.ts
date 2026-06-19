import { NextResponse } from "next/server"

// Wallet rewrap is not used in the managed embedded wallet model.
// The WEK is wrapped with the server master secret + userId  -  password changes
// do not affect wallet access. Password reset via Supabase Auth automatically
// restores wallet access without any re-wrapping step.
export async function POST() {
  return NextResponse.json(
    { error: "Not applicable in the managed wallet model." },
    { status: 410 }
  )
}
