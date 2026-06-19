import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const { caseId } = await request.json()
    if (!caseId) return NextResponse.json({ error: "caseId required" }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createAdminClient()

    // Check case belongs to user
    const { data: caseRow } = await admin
      .from("governance_cases")
      .select("id, status")
      .eq("id", caseId)
      .eq("user_id", user.id)
      .single()

    if (!caseRow) return NextResponse.json({ error: "Case not found" }, { status: 404 })

    // Reset status so user can resubmit
    await admin.from("governance_cases").update({ status: "open" }).eq("id", caseId)
    await admin.from("contract_activity_logs")
      .update({ status: "cancelled" })
      .eq("governance_case_id", caseId)
      .eq("status", "pending")

    return NextResponse.json({ ok: true, message: "Case reset to open  -  you can resubmit to GenLayer." })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
