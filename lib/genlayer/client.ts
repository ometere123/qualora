import "server-only"

const RPC_URL = process.env.GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api"

let _id = 1
function nextId() { return _id++ }

export async function rpcCall<T = unknown>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: nextId() }),
  })
  if (!res.ok) throw new Error(`GenLayer RPC HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(`GenLayer RPC error: ${json.error.message ?? JSON.stringify(json.error)}`)
  return json.result as T
}

export async function sendTransaction(params: {
  from: string
  to: string
  data: string
}): Promise<string> {
  return rpcCall<string>("eth_sendTransaction", [params])
}

export async function getTransactionReceipt(txHash: string): Promise<{
  status: string
  result?: unknown
} | null> {
  return rpcCall("eth_getTransactionReceipt", [txHash])
}

export async function callContract(params: {
  to: string
  data: string
}): Promise<unknown> {
  return rpcCall("eth_call", [params, "latest"])
}
