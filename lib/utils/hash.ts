import crypto from "crypto"

export function sha256Hex(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex")
}

export function shortHash(hash: string): string {
  return `0x${hash.slice(0, 6)}…${hash.slice(-4)}`
}
