const SMOKE_EVIDENCE_BODY = JSON.stringify({
  schema_version: "qualora.evidence-smoke.v1",
  fixture: "qualora-test-dataset.csv",
  purpose: "Production validator reachability and byte-integrity smoke test",
  facts: {
    row_count: 12,
    blank_customer_email_rows: 4,
    duplicate_customer_id: "C-1002",
  },
})

export async function GET() {
  return new Response(SMOKE_EVIDENCE_BODY, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
