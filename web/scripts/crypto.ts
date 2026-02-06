// bun run scripts/crypto.ts encrypt <key>
// bun run scripts/crypto.ts decrypt <key>
// bun run scripts/crypto.ts hmac <key>
//
// Interactive crypto tool for encrypt, decrypt, and HMAC blind indices

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  pbkdf2Sync,
  randomBytes,
} from "crypto"
import * as readline from "readline"
import { exec } from "child_process"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const PBKDF2_ITERATIONS = 100000
const SALT = "contexter-e2e-v1"
const INDEX_SALT = "contexter-search-index-v1"
const ENCRYPTED_PREFIX = "enc:v1:"

type Mode = "encrypt" | "decrypt" | "hmac"

function deriveKey(passphrase: string): Buffer {
  return pbkdf2Sync(passphrase, SALT, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256")
}

function deriveIndexKey(passphrase: string): Buffer {
  return pbkdf2Sync(passphrase, INDEX_SALT, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256")
}

function encryptText(plaintext: string, passphrase: string): string {
  if (!plaintext) {
    return plaintext
  }

  const key = deriveKey(passphrase)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  const ivB64 = iv.toString("base64")
  const authTagB64 = authTag.toString("base64")
  const ciphertextB64 = encrypted.toString("base64")

  return `${ENCRYPTED_PREFIX}${ivB64}:${authTagB64}:${ciphertextB64}`
}

function decryptText(ciphertext: string, passphrase: string): string | null {
  if (!ciphertext) {
    return ciphertext
  }

  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    return null
  }

  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(":")
  if (parts.length !== 3) {
    return null
  }

  const [ivB64, authTagB64, encryptedB64] = parts
  const iv = Buffer.from(ivB64, "base64")
  const authTag = Buffer.from(authTagB64, "base64")
  const encrypted = Buffer.from(encryptedB64, "base64")

  const key = deriveKey(passphrase)
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

function computeHmac(plaintext: string, passphrase: string): string {
  if (!plaintext) {
    return ""
  }

  const key = deriveIndexKey(passphrase)
  const hmac = createHmac("sha256", key)
  hmac.update(plaintext)
  return hmac.digest("hex")
}

function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = exec("pbcopy", (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
    proc.stdin?.write(text)
    proc.stdin?.end()
  })
}

function printUsage() {
  console.error(`Usage:
  bun run scripts/crypto.ts encrypt <key>
  bun run scripts/crypto.ts decrypt <key>
  bun run scripts/crypto.ts hmac <key>

Modes:
  encrypt - Encrypt plaintext using AES-256-GCM
  decrypt - Decrypt ciphertext (enc:v1:...)
  hmac    - Compute HMAC blind index for searching encrypted fields
            (deterministic hash - same input always produces same output)`)
  process.exit(1)
}

const mode = process.argv[2] as Mode | undefined
const passphrase = process.argv[3]

if (!mode || !["encrypt", "decrypt", "hmac"].includes(mode)) {
  printUsage()
}

if (!passphrase) {
  console.error(`Error: <key> is required for ${mode} mode\n`)
  printUsage()
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

let lastResult = ""

function printPrompt() {
  switch (mode) {
    case "encrypt":
      console.log("Enter plaintext to encrypt ('c' to copy, 'q' to quit):\n")
      break
    case "decrypt":
      console.log("Enter ciphertext to decrypt ('c' to copy, 'q' to quit):\n")
      break
    case "hmac":
      console.log("Enter plaintext to compute blind index ('c' to copy, 'q' to quit):\n")
      break
  }
}

printPrompt()

rl.on("line", async (line) => {
  const trimmed = line.trim()

  if (trimmed === "q") {
    rl.close()
    process.exit(0)
  }

  if (trimmed === "c") {
    if (lastResult) {
      await copyToClipboard(lastResult)
      console.log("Copied to clipboard!\n")
    } else {
      console.log("Nothing to copy.\n")
    }
    return
  }

  if (!trimmed) {
    return
  }

  try {
    switch (mode) {
      case "encrypt":
        lastResult = encryptText(trimmed, passphrase)
        console.log(`\n${lastResult}\n`)
        break
      case "decrypt": {
        const result = decryptText(trimmed, passphrase)
        if (result === null) {
          console.log("\nInvalid format (must start with enc:v1:)\n")
          return
        }
        lastResult = result
        console.log(`\n${lastResult}\n`)
        break
      }
      case "hmac":
        lastResult = computeHmac(trimmed, passphrase)
        console.log(`\n${lastResult}\n`)
        break
    }
    console.log("(press 'c' to copy)\n")
  } catch (err) {
    console.log(`\nError: ${err instanceof Error ? err.message : err}\n`)
  }
})
