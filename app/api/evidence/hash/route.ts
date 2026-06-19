import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sha256Hex } from "@/lib/utils/hash"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { content } = await request.json()
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 })

    const hash = sha256Hex(content)
    return NextResponse.json({ hash })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
