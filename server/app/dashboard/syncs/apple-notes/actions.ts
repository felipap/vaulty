"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { AppleNotes } from "@/db/schema"
import { desc, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type NoteItem = {
  id: string
  noteId: number
  title: string
  body: string
  folderName: string | null
  accountName: string | null
  isPinned: boolean
  noteCreatedAt: string
  noteModifiedAt: string
  updatedAt: Date
}

export type NotesPage = {
  notes: NoteItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getAppleNotes(
  page: number = 1,
  pageSize: number = 30
): Promise<NotesPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(AppleNotes)

  const total = countResult.count

  const results = await db.query.AppleNotes.findMany({
    orderBy: desc(AppleNotes.updatedAt),
    limit: pageSize,
    offset,
  })

  const notes: NoteItem[] = results.map((row) => ({
    id: row.id,
    noteId: row.noteId,
    title: row.title,
    body: row.body,
    folderName: row.folderName,
    accountName: row.accountName,
    isPinned: row.isPinned,
    noteCreatedAt: row.noteCreatedAt,
    noteModifiedAt: row.noteModifiedAt,
    updatedAt: row.updatedAt,
  }))

  return {
    notes,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getAppleNote(id: string): Promise<NoteItem | null> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const note = await db.query.AppleNotes.findFirst({
    where: (notes, { eq }) => eq(notes.id, id),
  })

  if (!note) {
    return null
  }

  return {
    id: note.id,
    noteId: note.noteId,
    title: note.title,
    body: note.body,
    folderName: note.folderName,
    accountName: note.accountName,
    isPinned: note.isPinned,
    noteCreatedAt: note.noteCreatedAt,
    noteModifiedAt: note.noteModifiedAt,
    updatedAt: note.updatedAt,
  }
}

export async function deleteAllAppleNotes(): Promise<{ deleted: number }> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const result = await db.delete(AppleNotes).returning({ id: AppleNotes.id })
  return { deleted: result.length }
}
