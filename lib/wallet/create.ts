import "server-only"
import { ethers } from "ethers"
import crypto from "crypto"

const ITERATIONS = 210_000
const KEY_LEN = 32
const DIGEST = "sha256"
const VERSION = 2

function derivePbkdf2(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LEN, DIGEST)
}

function aesgcmEncrypt(data: string, key: Buffer): { ciphertext: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  }
}

export function aesgcmDecrypt(ciphertext: string, iv: string, tag: string, key: Buffer): string {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}

export interface WalletBundle {
  address: string
  encryptedPrivateKey: string  // JSON: { ciphertext, iv, tag } — encrypted with WEK
  encryptionVersion: number
  managedWrap: {               // WEK wrapped with server master secret + userId
    encryptedWalletKey: string // JSON: { ciphertext, iv, tag }
    salt: string               // base64
    kdfParams: object
  }
}

/**
 * Creates a managed embedded wallet.
 * The WEK is wrapped with PBKDF2(WALLET_MASTER_SECRET || userId) — a purely
 * server-side derivation. The user never holds a key material secret.
 * Password reset restores wallet access automatically once the Supabase session
 * is re-established — no seed phrase required.
 */
export function createWalletBundle(userId: string, masterSecret: string): WalletBundle {
  // 1. Generate wallet
  const wallet = ethers.Wallet.createRandom()
  const privateKey = wallet.privateKey

  // 2. Generate wallet encryption key (WEK)
  const walletEncKey = crypto.randomBytes(32)

  // 3. Encrypt private key with WEK
  const pkEncrypted = aesgcmEncrypt(privateKey, walletEncKey)

  // 4. Derive managed key from server secret + userId and wrap WEK
  const salt = crypto.randomBytes(32)
  const passphrase = `${masterSecret}:${userId}`
  const managedKey = derivePbkdf2(passphrase, salt)
  const managedWrapData = aesgcmEncrypt(walletEncKey.toString("base64"), managedKey)

  const kdfParams = { algorithm: "pbkdf2", digest: DIGEST, iterations: ITERATIONS, keyLen: KEY_LEN }

  return {
    address: wallet.address,
    encryptedPrivateKey: JSON.stringify(pkEncrypted),
    encryptionVersion: VERSION,
    managedWrap: {
      encryptedWalletKey: JSON.stringify(managedWrapData),
      salt: salt.toString("base64"),
      kdfParams,
    },
  }
}
