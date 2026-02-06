"use client"

import { SearchIcon } from "@/ui/icons"
import { useEffect, useRef, useState } from "react"
import { ChatsTable } from "./ChatsTable"
import { useChatList } from "./useChatList"

export default function Page() {
  const {
    chats,
    loading,
    page,
    totalPages,
    total,
    search,
    setPage,
    setSearch,
  } = useChatList()

  return (
    <>
      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <SearchInput
            placeholder="Search by phone number..."
            onChange={setSearch}
            debounceMs={300}
          />
          <span className="text-sm text-zinc-500">
            {total.toLocaleString()} {search ? "matching" : "total"} chats
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Phone: full number with country code (e.g. +1234567890), no spaces or
          dashes. Chat name: lowercase, no punctuation.
        </p>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : chats.length === 0 ? (
        <p className="text-zinc-500">
          {search ? "No chats match your search." : "No WhatsApp chats yet."}
        </p>
      ) : (
        <ChatsTable
          chats={chats}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </>
  )
}

type SearchInputProps = {
  placeholder?: string
  onChange: (value: string) => void
  debounceMs?: number
}

function SearchInput({
  placeholder,
  onChange,
  debounceMs = 300,
}: SearchInputProps) {
  const [value, setValue] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      onChange(value)
    }, debounceMs)
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, debounceMs, onChange])

  return (
    <div className="relative">
      <div className="absolute top-2.5 left-2">
        <SearchIcon size={16} className="text-zinc-400" />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-[300px] rounded-lg border border-zinc-200 bg-white py-2 pl-7 pr-3 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-600"
      />
    </div>
  )
}
