import { NextResponse } from "next/server"

export async function GET() {
  const rpcUrl = process.env.GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api"
  const expectedChainId = process.env.GENLAYER_CHAIN_ID ?? "61999"

  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "net_version", params: [], id: 1 }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json({
        online: false,
        chain_id: null,
        expected_chain_id: expectedChainId,
        error: `GenLayer RPC HTTP ${res.status}`,
      })
    }

    const json = await res.json()
    const chainId = String(json.result ?? "")
    const online = chainId === expectedChainId

    return NextResponse.json({
      online,
      chain_id: chainId || null,
      expected_chain_id: expectedChainId,
      error: online ? null : json.error?.message ?? "Unexpected StudioNet chain response",
    })
  } catch (error) {
    return NextResponse.json({
      online: false,
      chain_id: null,
      expected_chain_id: expectedChainId,
      error: error instanceof Error ? error.message : "StudioNet status check failed",
    })
  }
}
