"use client"

import { useState, useCallback } from "react"
import { EmptyState, LoadingState } from "@/ui/PageHeader"
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
        <LoadingState />
      ) : chats.length === 0 ? (
        <EmptyState
          message={
            hasActiveFilters
              ? "No chats matching your search."
              : "No iMessage chats yet."
          }
        />
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
