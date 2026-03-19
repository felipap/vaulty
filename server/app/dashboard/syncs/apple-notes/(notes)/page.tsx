"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getAppleNotes, deleteAllAppleNotes, type NoteItem } from "../actions"
import { Pagination } from "@/ui/Pagination"
import { maybeDecrypt } from "@/lib/encryption"
import {
  PageHeader,
  PageCount,
  EmptyState,
  LoadingState,
} from "@/ui/PageHeader"
import { twMerge } from "tailwind-merge"

export default function Page() {
  const router = useRouter()
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [decrypted, setDecrypted] = useState<
    Record<string, { title: string | null; body: string | null; folderName: string | null }>
  >({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getAppleNotes(page)
      setNotes(data.notes)
      setTotalPages(data.totalPages)
      setTotal(data.total)

      const dec: Record<string, { title: string | null; body: string | null; folderName: string | null }> = {}
      for (const note of data.notes) {
        dec[note.id] = {
          title: await maybeDecrypt(note.title),
          body: await maybeDecrypt(note.body),
          folderName: note.folderName ? await maybeDecrypt(note.folderName) : null,
        }
      }
      setDecrypted(dec)

      setLoading(false)
    }
    load()
  }, [page])

  async function handleDeleteAll() {
    await deleteAllAppleNotes()
    router.refresh()
  }

  let inner
  if (loading) {
    inner = <LoadingState />
  } else if (notes.length === 0) {
    inner = <EmptyState message="No Apple Notes yet." />
  } else {
    inner = (
      <>
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              decryptedTitle={decrypted[note.id]?.title ?? null}
              decryptedBody={decrypted[note.id]?.body ?? null}
              decryptedFolderName={decrypted[note.id]?.folderName ?? null}
            />
          ))}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </>
    )
  }

  return (
    <div>
      <PageHeader
        title="Apple Notes"
        onDeleteAll={handleDeleteAll}
        deleteConfirmMessage="Delete all Apple Notes? This will permanently delete all synced notes from the database."
      >
        {total > 0 && <PageCount total={total} />}
      </PageHeader>
      {inner}
    </div>
  )
}

function NoteCard({
  note,
  decryptedTitle,
  decryptedBody,
  decryptedFolderName,
}: {
  note: NoteItem
  decryptedTitle: string | null
  decryptedBody: string | null
  decryptedFolderName: string | null
}) {
  const title = decryptedTitle ?? note.title
  const body = decryptedBody ?? note.body
  const folderName = decryptedFolderName ?? note.folderName

  return (
    <Link
      href={`/dashboard/syncs/apple-notes/${note.id}`}
      className={twMerge(
        "block border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800",
        note.isPinned && "border-l-2 border-l-amber-400 dark:border-l-amber-500"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-all text-sm font-medium leading-snug line-clamp-2">
          {title || <span className="italic text-secondary">Untitled</span>}
        </p>
        {note.isPinned && (
          <span className="shrink-0 text-xs text-amber-500">Pinned</span>
        )}
      </div>
      {body && (
        <p className="mt-1.5 break-all text-sm text-secondary line-clamp-3">
          {body}
        </p>
      )}
      <div className="mt-2.5 flex items-center gap-2 text-xs text-tertiary">
        {folderName && <span>{folderName}</span>}
        <span>{formatDate(note.noteModifiedAt)}</span>
      </div>
    </Link>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return dateStr
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
