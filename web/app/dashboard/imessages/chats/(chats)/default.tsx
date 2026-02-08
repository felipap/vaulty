"use client"

import { useState, useCallback } from "react"
import { ChatsTable } from "../ChatsTable"
import { useChatList } from "../useChatList"
import { IMessageChatsSearch } from "../IMessageChatsSearch"

export default function Page() {
  const {
    chats,
    contactLookup,
    loading,
    page,
    totalPages,
    total,
    filters,
    hasActiveFilters,
    setPage,
    setFilter,
    clearFilters,
  } = useChatList()

  const [searchOpen, setSearchOpen] = useState(false)

  const handleSearchToggle = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) {
        clearFilters()
      }
      return !prev
    })
  }, [clearFilters])

  return (
    <>
      <IMessageChatsSearch
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        total={total}
        searchOpen={searchOpen}
        onSearchToggle={handleSearchToggle}
        onFilterChange={setFilter}
        debounceMs={300}
      />

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : chats.length === 0 ? (
        <p className="text-zinc-500">
          {hasActiveFilters
            ? "No chats match your search."
            : "No iMessage chats yet."}
        </p>
      ) : (
        <ChatsTable
          chats={chats}
          contactLookup={contactLookup}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </>
  )
}
