import { NextResponse } from "next/server"
import { ethers } from "ethers"

function genlayerAccountAddress() {
  const privateKey = process.env.GENLAYER_PRIVATE_KEY
  if (!privateKey) return null
  try {
    return new ethers.Wallet(privateKey).address
  } catch {
    return "invalid_private_key"
  }
}

export async function GET() {
  const privateKey = process.env.GENLAYER_PRIVATE_KEY
  const trimmedPrivateKey = privateKey?.trim()

  return NextResponse.json({
    status: "ok",
    service: "qualora",
    timestamp: new Date().toISOString(),
    genlayer: {
      chain_id: process.env.GENLAYER_CHAIN_ID,
      contract: process.env.GENLAYER_CONTRACT_ADDRESS || "not_deployed",
      public_contract:
        process.env.NEXT_PUBLIC_QUALORA_CONTRACT_ADDRESS ||
        process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ||
        "not_deployed",
      has_private_key: Boolean(privateKey),
      private_key_length: trimmedPrivateKey?.length ?? 0,
      private_key_starts_with_0x: trimmedPrivateKey?.startsWith("0x") ?? false,
      account_address: genlayerAccountAddress(),
    },
  })
}
