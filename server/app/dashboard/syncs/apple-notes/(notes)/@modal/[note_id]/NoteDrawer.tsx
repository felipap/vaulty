"use client"

import { useEffect, useState } from "react"
import { Drawer } from "@/ui/Drawer"
import { InfoRow } from "@/ui/InfoRow"
import { RawJson } from "@/ui/RawJson"
import { maybeDecrypt } from "@/lib/encryption"
import { type NoteItem } from "../../../actions"

type Props = {
  note: NoteItem
}

export function NoteDrawer({ note }: Props) {
  const [decrypted, setDecrypted] = useState<{
    title: string | null
    body: string | null
    folderName: string | null
    accountName: string | null
  }>({
    title: null,
    body: null,
    folderName: null,
    accountName: null,
  })

  useEffect(() => {
    async function decrypt() {
      const [title, body, folderName, accountName] = await Promise.all([
        maybeDecrypt(note.title),
        maybeDecrypt(note.body),
        note.folderName ? maybeDecrypt(note.folderName) : null,
        note.accountName ? maybeDecrypt(note.accountName) : null,
      ])
      setDecrypted({ title, body, folderName, accountName })
    }
    decrypt()
  }, [note])

  const title = decrypted.title ?? note.title
  const body = decrypted.body ?? note.body
  const folderName = decrypted.folderName ?? note.folderName
  const accountName = decrypted.accountName ?? note.accountName

  const displayTitle = (title || "Untitled Note").slice(0, 50) + ((title?.length ?? 0) > 50 ? "…" : "")

  return (
    <Drawer title={displayTitle}>
      <div className="space-y-4 min-w-0">
        {note.isPinned && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Pinned
          </div>
        )}
        {folderName && <InfoRow label="Folder" value={folderName} />}
        {accountName && <InfoRow label="Account" value={accountName} />}
        <InfoRow
          label="Created"
          value={formatDate(note.noteCreatedAt)}
        />
        <InfoRow
          label="Modified"
          value={formatDate(note.noteModifiedAt)}
        />
        <div className="min-w-0">
          <label className="mb-1 block text-sm font-medium text-secondary">
            Content
          </label>
          <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950 overflow-hidden">
            {body ? (
              <div className="whitespace-pre-wrap break-all text-sm text-contrast">
                {body}
              </div>
            ) : (
              <span className="text-sm italic text-secondary">No content</span>
            )}
          </div>
        </div>
      </div>
      <RawJson data={note} />
    </Drawer>
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
