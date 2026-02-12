"use client"

import { useEffect, useState } from "react"
import { getStickies, type StickyNote } from "./actions"
import { Pagination } from "@/ui/Pagination"
import { maybeDecrypt } from "@/lib/encryption"

export default function Page() {
  const [stickies, setStickies] = useState<StickyNote[]>([])
  const [decryptedTexts, setDecryptedTexts] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getStickies(page)
      setStickies(data.stickies)
      setTotalPages(data.totalPages)
      setTotal(data.total)

      // Decrypt texts client-side
      const decrypted: Record<string, string | null> = {}
      for (const sticky of data.stickies) {
        decrypted[sticky.id] = await maybeDecrypt(sticky.text)
      }
      setDecryptedTexts(decrypted)

      setLoading(false)
    }
    load()
  }, [page])

  let inner
  if (loading) {
    inner = <p className="text-zinc-500">Loading...</p>
  } else if (stickies.length === 0) {
    inner = <p className="text-zinc-500">No macOS stickies yet.</p>
  } else {
    inner = (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stickies.map((sticky) => (
            <StickyCard
              key={sticky.id}
              sticky={sticky}
              decryptedText={decryptedTexts[sticky.id] ?? null}
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="heading-page">macOS Stickies</h1>
        <span className="text-sm text-zinc-500">
          {total.toLocaleString()} total
        </span>
      </div>

      {inner}
    </div>
  )
}

function StickyCard({
  sticky,
  decryptedText,
}: {
  sticky: StickyNote
  decryptedText: string | null
}) {
  const displayText = decryptedText ?? sticky.text

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="whitespace-pre-wrap text-sm leading-relaxed line-clamp-6">
        {displayText || <span className="italic text-zinc-400">Empty note</span>}
      </p>
      <p className="mt-3 text-xs text-zinc-400">
        {formatDate(sticky.updatedAt)}
      </p>
    </div>
  )
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
