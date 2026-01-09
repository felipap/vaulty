/**
 * Import locations from JSON file with encryption.
 *
 * Usage:
 *   ENCRYPTION_KEY=your-key npx tsx scripts/import-locations-encrypted.ts ../felipe-locations-dump-disturbed.json
 *
 * This will:
 *   1. Truncate the existing locations table
 *   2. Read locations from the JSON file
 *   3. Encrypt latitude and longitude fields
 *   4. Insert encrypted locations into the database
 */

import { createCipheriv, pbkdf2Sync, randomBytes } from "crypto"
import { readFileSync } from "fs"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { sql } from "drizzle-orm"
import * as schema from "../db/schema"

// Encryption constants - must match desktop/backend/lib/encryption.ts
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const PBKDF2_ITERATIONS = 100000
const SALT = "contexter-e2e-v1"
const ENCRYPTED_PREFIX = "enc:v1:"

function deriveKey(passphrase: string): Buffer {
  return pbkdf2Sync(passphrase, SALT, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256")
}

function encryptText(plaintext: string, passphrase: string): string {
  if (!plaintext || !passphrase) {
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

type RawLocation = {
  id: string
  unique_id: string
  timestamp: string
  user_id: number
  latitude: string
  longitude: string
  place_id: string | null
  accuracy: number | null
  source: string
  location_info_id: string | null
  created_at: string
}

async function main() {
  const encryptionKey = process.env.ENCRYPTION_KEY
  if (!encryptionKey) {
    console.error("Error: ENCRYPTION_KEY environment variable is required")
    console.error(
      "Usage: ENCRYPTION_KEY=your-key npx tsx scripts/import-locations-encrypted.ts <json-file>"
    )
    process.exit(1)
  }

  const jsonFile = process.argv[2]
  if (!jsonFile) {
    console.error("Error: JSON file path is required")
    console.error(
      "Usage: ENCRYPTION_KEY=your-key npx tsx scripts/import-locations-encrypted.ts <json-file>"
    )
    process.exit(1)
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error("Error: DATABASE_URL environment variable is required")
    process.exit(1)
  }

  console.log(`Reading locations from ${jsonFile}...`)
  const rawData = readFileSync(jsonFile, "utf-8")
  const locations: RawLocation[] = JSON.parse(rawData)
  console.log(`Found ${locations.length} locations to import`)

  const client = postgres(connectionString)
  const db = drizzle(client, { schema })

  console.log("Truncating existing locations...")
  await db.execute(sql`TRUNCATE TABLE locations`)
  console.log("Truncated locations table")

  console.log("Encrypting and inserting locations...")

  const BATCH_SIZE = 1000
  let processed = 0

  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE)

    const encryptedBatch = batch.map((loc) => ({
      id: loc.id,
      uniqueId: loc.unique_id,
      timestamp: new Date(loc.timestamp),
      userId: loc.user_id,
      latitude: encryptText(loc.latitude, encryptionKey),
      longitude: encryptText(loc.longitude, encryptionKey),
      placeId: loc.place_id,
      accuracy: loc.accuracy,
      source: loc.source,
      locationInfoId: loc.location_info_id,
      createdAt: new Date(loc.created_at),
    }))

    await db.insert(schema.Locations).values(encryptedBatch)

    processed += batch.length
    console.log(`Processed ${processed}/${locations.length} locations`)
  }

  console.log(`\nSuccessfully imported ${locations.length} encrypted locations`)

  await client.end()
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
