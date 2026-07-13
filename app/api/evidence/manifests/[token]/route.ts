import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid evidence token" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("dataset_profiles")
    .select("evidence_manifest_json")
    .eq("evidence_public_token", token)
    .single()

  if (error || !data?.evidence_manifest_json) {
    return NextResponse.json({ error: "Evidence manifest not found" }, { status: 404 })
  }

  return new NextResponse(data.evidence_manifest_json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
