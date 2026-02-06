"use client"

import { SortSelector } from "@/ui/SortSelector"
import { type SortBy } from "./actions"
import { useMessageList } from "./useMessageList"
import { MessagesTable } from "./MessagesTable"

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "syncTime", label: "Time received" },
  { value: "timestamp", label: "Message date" },
]

export default function Page() {
  const {
    messages,
    loading,
    page,
    totalPages,
    total,
    sortBy,
    setPage,
    setSortBy,
  } = useMessageList()

  if (loading) {
    return <p className="text-zinc-500">Loading...</p>
  }

  if (messages.length === 0) {
    return <p className="text-zinc-500">No WhatsApp messages yet.</p>
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-zinc-500">
          {total.toLocaleString()} total messages
        </span>
        <SortSelector
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS}
        />
      </div>
      <MessagesTable
        messages={messages}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        sortBy={sortBy}
      />
    </>
  )
}
