"use client"

import { SortSelector } from "@/ui/SortSelector"
import { PageCount, EmptyState, LoadingState } from "@/ui/PageHeader"
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
    return <LoadingState />
  }

  if (messages.length === 0) {
    return <EmptyState message="No WhatsApp messages yet." />
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <PageCount total={total} />
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
