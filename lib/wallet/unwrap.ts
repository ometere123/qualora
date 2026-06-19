import "server-only"
import crypto from "crypto"
import { aesgcmDecrypt } from "./create"

const ITERATIONS = 210_000
const KEY_LEN = 32
const DIGEST = "sha256"

function derivePbkdf2(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LEN, DIGEST)
}

/**
 * Unwraps the WEK using the server master secret + userId.
 * Called server-side only  -  never in browser code.
 */
export function unwrapWalletKey(
  encryptedWalletKey: string,
  salt: string,
  userId: string,
  masterSecret: string
): Buffer {
  const parsed = JSON.parse(encryptedWalletKey) as { ciphertext: string; iv: string; tag: string }
  const saltBuf = Buffer.from(salt, "base64")
  const passphrase = `${masterSecret}:${userId}`
  const derivedKey = derivePbkdf2(passphrase, saltBuf)
  const walletEncKeyB64 = aesgcmDecrypt(parsed.ciphertext, parsed.iv, parsed.tag, derivedKey)
  return Buffer.from(walletEncKeyB64, "base64")
}

export function decryptPrivateKey(encryptedPrivateKey: string, walletEncKey: Buffer): string {
  const parsed = JSON.parse(encryptedPrivateKey) as { ciphertext: string; iv: string; tag: string }
  return aesgcmDecrypt(parsed.ciphertext, parsed.iv, parsed.tag, walletEncKey)
}
