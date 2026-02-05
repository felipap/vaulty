// ENCRYPTION_KEY=your-key bun scripts/decrypt-proxy.ts

import { createServer, IncomingMessage, ServerResponse } from "http"

const PROXY_PORT = 3001
const TARGET_HOST = process.env.TARGET_HOST || "http://localhost:3030"
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ""

if (!ENCRYPTION_KEY) {
  console.error("❌ ENCRYPTION_KEY environment variable is required")
  console.error(
    "Usage: ENCRYPTION_KEY=your-key npx tsx scripts/decrypt-proxy.ts"
  )
  process.exit(1)
}

const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256
const PBKDF2_ITERATIONS = 100000
const SALT = "contexter-e2e-v1"
const ENCRYPTED_PREFIX = "enc:v1:"

const WHATSAPP_ENCRYPTED_FIELDS = [
  "text",
  "chatName",
  "senderName",
  "senderPhoneNumber",
]
const IMESSAGE_ENCRYPTED_FIELDS = ["text", "subject"]

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["decrypt"]
  )
}

async function decryptText(
  ciphertext: string,
  passphrase: string
): Promise<string | null> {
  if (!ciphertext || !passphrase) {
    return ciphertext
  }

  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    return ciphertext
  }

  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(":")
  if (parts.length !== 3) {
    return null
  }

  const [ivB64, authTagB64, encryptedB64] = parts

  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const authTag = Uint8Array.from(atob(authTagB64), (c) => c.charCodeAt(0))
  const encrypted = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0))

  const combined = new Uint8Array(encrypted.length + authTag.length)
  combined.set(encrypted)
  combined.set(authTag, encrypted.length)

  const key = await deriveKey(passphrase)

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    combined
  )

  return new TextDecoder().decode(decrypted)
}

async function decryptObject(
  obj: unknown,
  encryptedFields: string[]
): Promise<unknown> {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return Promise.all(obj.map((item) => decryptObject(item, encryptedFields)))
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (encryptedFields.includes(key) && typeof value === "string") {
        result[key] = await decryptText(value, ENCRYPTION_KEY)
      } else if (typeof value === "object") {
        result[key] = await decryptObject(value, encryptedFields)
      } else {
        result[key] = value
      }
    }
    return result
  }

  return obj
}

function getEncryptedFieldsForPath(path: string): string[] {
  if (path.includes("/whatsapp")) {
    return WHATSAPP_ENCRYPTED_FIELDS
  }
  if (path.includes("/imessages")) {
    return IMESSAGE_ENCRYPTED_FIELDS
  }
  return [...WHATSAPP_ENCRYPTED_FIELDS, ...IMESSAGE_ENCRYPTED_FIELDS]
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", `http://localhost:${PROXY_PORT}`)
  const targetUrl = `${TARGET_HOST}${url.pathname}${url.search}`

  console.log(`→ ${req.method} ${url.pathname}`)

  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (value && key.toLowerCase() !== "host") {
      headers[key] = Array.isArray(value) ? value.join(", ") : value
    }
  }

  let body: string | undefined
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    body = await new Promise<string>((resolve) => {
      let data = ""
      req.on("data", (chunk) => (data += chunk))
      req.on("end", () => resolve(data))
    })
  }

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
  })

  const contentType = response.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const json = await response.json()
    const encryptedFields = getEncryptedFieldsForPath(url.pathname)
    const decrypted = await decryptObject(json, encryptedFields)

    res.writeHead(response.status, {
      "Content-Type": "application/json",
      "X-Decrypted-By": "decrypt-proxy",
    })
    res.end(JSON.stringify(decrypted, null, 2))
    console.log(`← ${response.status} (decrypted)`)
  } else {
    const buffer = await response.arrayBuffer()
    res.writeHead(response.status, {
      "Content-Type": contentType,
    })
    res.end(Buffer.from(buffer))
    console.log(`← ${response.status} (passthrough)`)
  }
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("Error:", err.message)
    res.writeHead(500, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: err.message }))
  })
})

server.listen(PROXY_PORT, () => {
  console.log(`\n🔓 Decrypt proxy running on http://localhost:${PROXY_PORT}`)
  console.log(`   Forwarding to ${TARGET_HOST}`)
  console.log(
    `\n   Example: curl http://localhost:${PROXY_PORT}/api/whatsapp/messages\n`
  )
})
