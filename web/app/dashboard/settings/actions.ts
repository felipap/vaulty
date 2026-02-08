"use server"

import {
  createAccessToken,
  listAccessTokens,
  revokeAccessToken,
} from "@/lib/access-tokens"
import type { Scope } from "@/lib/access-tokens.shared"
import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import {
  Screenshots,
  iMessages,
  iMessageAttachments,
  Contacts,
  Locations,
  WhatsappMessages,
  WriteLogs,
  ReadLogs,
  AccessTokens,
} from "@/db/schema"

export async function getAccessTokens() {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const tokens = await listAccessTokens()
  return tokens.map((t) => ({
    id: t.id,
    name: t.name,
    tokenPrefix: t.tokenPrefix,
    scopes: t.scopes ?? [],
    expiresAt: t.expiresAt?.toISOString() ?? null,
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }))
}

export async function createToken(
  name: string,
  expiresInDays?: number,
  scopes?: string[]
) {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : undefined

  const { token, record } = await createAccessToken(
    name,
    expiresAt,
    scopes as Scope[]
  )

  return {
    token,
    id: record.id,
    name: record.name,
    tokenPrefix: record.tokenPrefix,
    scopes: record.scopes ?? [],
    expiresAt: record.expiresAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  }
}

export async function revokeToken(id: string) {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const revoked = await revokeAccessToken(id)
  if (!revoked) {
    throw new Error("Token not found")
  }

  return { success: true }
}

export async function deleteEverything() {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const [screenshots] = await db
    .delete(Screenshots)
    .returning({ id: Screenshots.id })
    .then((rows) => [rows.length])

  const [attachments] = await db
    .delete(iMessageAttachments)
    .returning({ id: iMessageAttachments.id })
    .then((rows) => [rows.length])

  const [messages] = await db
    .delete(iMessages)
    .returning({ id: iMessages.id })
    .then((rows) => [rows.length])

  const [contacts] = await db
    .delete(Contacts)
    .returning({ id: Contacts.id })
    .then((rows) => [rows.length])

  const [locations] = await db
    .delete(Locations)
    .returning({ id: Locations.id })
    .then((rows) => [rows.length])

  const [whatsapp] = await db
    .delete(WhatsappMessages)
    .returning({ id: WhatsappMessages.id })
    .then((rows) => [rows.length])

  const [writeLogs] = await db
    .delete(WriteLogs)
    .returning({ id: WriteLogs.id })
    .then((rows) => [rows.length])

  const [readLogs] = await db
    .delete(ReadLogs)
    .returning({ id: ReadLogs.id })
    .then((rows) => [rows.length])

  const [tokens] = await db
    .delete(AccessTokens)
    .returning({ id: AccessTokens.id })
    .then((rows) => [rows.length])

  return {
    screenshots,
    attachments,
    messages,
    contacts,
    locations,
    whatsapp,
    writeLogs,
    readLogs,
    tokens,
  }
}
