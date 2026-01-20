// E2E decryption utilities using Web Crypto API
// Compatible with Node.js crypto on the desktop side

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const PBKDF2_ITERATIONS = 100000
const SALT = 'contexter-e2e-v1' // Fixed salt for cross-platform compatibility

const ENCRYPTED_PREFIX = 'enc:v1:'
const SESSION_KEY = 'encryption_key'
const EXPIRY_KEY = 'encryption_key_expiry'
const EXPIRY_HOURS = 1

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['decrypt']
  )
}

export async function decryptText(
  ciphertext: string,
  passphrase: string
): Promise<string | null> {
  if (!ciphertext || !passphrase) {
    return ciphertext
  }

  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    // Not encrypted, return as-is
    return ciphertext
  }

  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(':')
  if (parts.length !== 3) {
    return null
  }

  const [ivB64, authTagB64, encryptedB64] = parts

  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const authTag = Uint8Array.from(atob(authTagB64), (c) => c.charCodeAt(0))
  const encrypted = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0))

  // GCM expects the auth tag appended to the ciphertext
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

export function isEncrypted(text: string | null): boolean {
  return text !== null && text.startsWith(ENCRYPTED_PREFIX)
}

// Decrypts binary data (stored as enc:v1: string) and returns base64
// Use this for attachments where the original data was binary, not text
export async function decryptBinaryToBase64(
  ciphertext: string,
  passphrase: string
): Promise<string | null> {
  if (!ciphertext || !passphrase) {
    return ciphertext
  }

  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    // Not encrypted, return as-is (assuming it's already base64)
    return ciphertext
  }

  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(':')
  if (parts.length !== 3) {
    return null
  }

  const [ivB64, authTagB64, encryptedB64] = parts

  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const authTag = Uint8Array.from(atob(authTagB64), (c) => c.charCodeAt(0))
  const encrypted = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0))

  // GCM expects the auth tag appended to the ciphertext
  const combined = new Uint8Array(encrypted.length + authTag.length)
  combined.set(encrypted)
  combined.set(authTag, encrypted.length)

  const key = await deriveKey(passphrase)

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    combined
  )

  // Convert decrypted binary to base64
  const decryptedArray = new Uint8Array(decrypted)
  let binary = ''
  for (let i = 0; i < decryptedArray.length; i++) {
    binary += String.fromCharCode(decryptedArray[i])
  }
  return btoa(binary)
}

// Session storage helpers with expiry

export function setEncryptionKey(key: string): void {
  if (typeof window === 'undefined') {
    return
  }
  const expiry = Date.now() + EXPIRY_HOURS * 60 * 60 * 1000
  sessionStorage.setItem(SESSION_KEY, key)
  sessionStorage.setItem(EXPIRY_KEY, expiry.toString())
}

export function getEncryptionKey(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  const key = sessionStorage.getItem(SESSION_KEY)
  const expiryStr = sessionStorage.getItem(EXPIRY_KEY)

  if (!key || !expiryStr) {
    return null
  }

  const expiry = parseInt(expiryStr, 10)
  if (Date.now() > expiry) {
    clearEncryptionKey()
    return null
  }

  return key
}

export function clearEncryptionKey(): void {
  if (typeof window === 'undefined') {
    return
  }
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(EXPIRY_KEY)
}

export function getEncryptionKeyExpiry(): Date | null {
  if (typeof window === 'undefined') {
    return null
  }
  const expiryStr = sessionStorage.getItem(EXPIRY_KEY)
  if (!expiryStr) {
    return null
  }
  return new Date(parseInt(expiryStr, 10))
}

// Binary decryption for files like screenshots
// Format: 4-byte magic "CTXE" + 1-byte version + 12-byte IV + 16-byte authTag + ciphertext

const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

async function deriveKeyForBuffer(passphrase: string): Promise<CryptoKey> {
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
    { name: ALGORITHM, length: 256 },
    false,
    ["decrypt"]
  )
}

export function isEncryptedBuffer(dataUrl: string): boolean {
  // Check if the data URL contains our encrypted format
  if (!dataUrl.startsWith("data:application/octet-stream;base64,")) {
    return false
  }
  const base64 = dataUrl.slice("data:application/octet-stream;base64,".length)
  const firstBytes = atob(base64.slice(0, 8)) // Get first few bytes
  return firstBytes.startsWith("CTXE")
}

export async function decryptBufferFromDataUrl(
  dataUrl: string,
  passphrase: string
): Promise<string | null> {
  if (!dataUrl || !passphrase) {
    return dataUrl
  }

  if (!isEncryptedBuffer(dataUrl)) {
    // Not encrypted, return as-is
    return dataUrl
  }

  const base64 = dataUrl.slice("data:application/octet-stream;base64,".length)
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Parse format: CTXE (4) + version (1) + IV (12) + authTag (16) + ciphertext
  const magic = String.fromCharCode(...bytes.subarray(0, 4))
  if (magic !== "CTXE") {
    return null
  }

  const version = bytes[4]
  if (version !== 0x01) {
    console.error("Unknown encryption version:", version)
    return null
  }

  const iv = bytes.subarray(5, 5 + IV_LENGTH)
  const authTag = bytes.subarray(5 + IV_LENGTH, 5 + IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = bytes.subarray(5 + IV_LENGTH + AUTH_TAG_LENGTH)

  // GCM expects auth tag appended to ciphertext
  const combined = new Uint8Array(encrypted.length + authTag.length)
  combined.set(encrypted)
  combined.set(authTag, encrypted.length)

  const key = await deriveKeyForBuffer(passphrase)

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    combined
  )

  // Convert decrypted webp to data URL
  const decryptedArray = new Uint8Array(decrypted)
  let binary = ""
  for (let i = 0; i < decryptedArray.length; i++) {
    binary += String.fromCharCode(decryptedArray[i])
  }
  const decryptedBase64 = btoa(binary)

  return `data:image/webp;base64,${decryptedBase64}`
}
