import { db } from "@/db"
import { AccessTokens } from "@/db/schema"
import { and, eq, gt, isNull, or } from "drizzle-orm"
import { createHash, randomBytes } from "crypto"
export type { Scope } from "./access-tokens.shared"
import type { Scope } from "./access-tokens.shared"

const TOKEN_PREFIX = "vault_"
const DISPLAY_PREFIX_LENGTH = 14 // "vault_" + 8 hex chars

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function generateAccessToken(
  name: string,
  expiresAt?: Date,
  scopes?: Scope[]
): { rawToken: string; values: typeof AccessTokens.$inferInsert } {
  const randomPart = randomBytes(25).toString("hex")
  const rawToken = `${TOKEN_PREFIX}${randomPart}`
  const tokenHash = hashToken(rawToken)
  const tokenPrefix = rawToken.slice(0, DISPLAY_PREFIX_LENGTH)

  return {
    rawToken,
    values: {
      name,
      tokenHash,
      tokenPrefix,
      scopes: scopes ?? [],
      expiresAt: expiresAt ?? null,
    },
  }
}

export async function createAccessToken(
  name: string,
  expiresAt?: Date,
  scopes?: Scope[]
) {
  const { rawToken, values } = generateAccessToken(name, expiresAt, scopes)

  const [record] = await db.insert(AccessTokens).values(values).returning()

  return { token: rawToken, record }
}

export async function validateAccessToken(rawToken: string) {
  if (!rawToken.startsWith(TOKEN_PREFIX)) {
    return null
  }

  const tokenHash = hashToken(rawToken)

  const record = await db.query.AccessTokens.findFirst({
    where: and(
      eq(AccessTokens.tokenHash, tokenHash),
      isNull(AccessTokens.revokedAt),
      or(isNull(AccessTokens.expiresAt), gt(AccessTokens.expiresAt, new Date()))
    ),
  })

  if (!record) {
    return null
  }

  // Update lastUsedAt in the background
  db.update(AccessTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(AccessTokens.id, record.id))
    .then(() => {})

  return record
}

export async function listAccessTokens() {
  return db.query.AccessTokens.findMany({
    where: isNull(AccessTokens.revokedAt),
    orderBy: (tokens, { desc }) => [desc(tokens.createdAt)],
  })
}

export async function revokeAccessToken(id: string) {
  const [record] = await db
    .update(AccessTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(AccessTokens.id, id), isNull(AccessTokens.revokedAt)))
    .returning()

  return record ?? null
}
