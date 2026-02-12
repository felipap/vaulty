"use client"

import { SearchIcon, CloseIcon, LockIcon } from "@/ui/icons"
import { useEffect, useRef, useState } from "react"
import { twMerge } from "tailwind-merge"
import { getEncryptionKey } from "@/lib/encryption"
import { PageCount } from "@/ui/PageHeader"
import type { ChatFilters } from "./useChatList"

type Props = {
  filters: ChatFilters
  hasActiveFilters: boolean
  total: number
  searchOpen: boolean
  onSearchToggle: () => void
  onFilterChange: (field: keyof ChatFilters, value: string) => void
  debounceMs?: number
}

export function WhatsappChatsSearch({
  filters,
  hasActiveFilters,
  total,
  searchOpen,
  onSearchToggle,
  onFilterChange,
  debounceMs = 300,
}: Props) {
  const hasKey = getEncryptionKey() !== null

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <button
          onClick={onSearchToggle}
          className={twMerge(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
            searchOpen
              ? "border-zinc-400 bg-zinc-100 text-contrast dark:border-zinc-500 dark:bg-zinc-800"
              : "border-zinc-200 bg-white text-secondary hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          )}
        >
          {searchOpen ? <CloseIcon size={14} /> : <SearchIcon size={14} />}
          {searchOpen ? "Close search" : "Search"}
        </button>
        <PageCount total={total} filtered={hasActiveFilters} />
      </div>

      {searchOpen && (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="grid grid-cols-2 gap-3">
            <SearchField
              label="Sender JID"
              placeholder="e.g. 1234567890@s.whatsapp.net"
              value={filters.senderJid}
              onChange={(v) => onFilterChange("senderJid", v)}
              debounceMs={debounceMs}
            />
            <SearchField
              label="Chat ID"
              placeholder="e.g. 1234567890@s.whatsapp.net"
              value={filters.chatId}
              onChange={(v) => onFilterChange("chatId", v)}
              debounceMs={debounceMs}
            />
            <SearchField
              label="Phone"
              placeholder={
                hasKey ? "e.g. +1234567890" : "Requires decryption key"
              }
              value={filters.phone}
              onChange={(v) => onFilterChange("phone", v)}
              debounceMs={debounceMs}
              disabled={!hasKey}
              locked
            />
            <SearchField
              label="Sender Name"
              placeholder={hasKey ? "Exact match" : "Requires decryption key"}
              value={filters.senderName}
              onChange={(v) => onFilterChange("senderName", v)}
              debounceMs={debounceMs}
              disabled={!hasKey}
              locked
            />
            <SearchField
              label="Chat Name"
              placeholder={hasKey ? "Exact match" : "Requires decryption key"}
              value={filters.chatName}
              onChange={(v) => onFilterChange("chatName", v)}
              debounceMs={debounceMs}
              disabled={!hasKey}
              locked
            />
          </div>
          {!hasKey && (
            <p className="flex items-center gap-1.5 text-xs text-secondary">
              <LockIcon size={12} />
              Phone, sender name, and chat name search require the decryption
              key. Enter it in the navbar to enable these fields.
            </p>
          )}
          <p className="text-xs text-secondary">
            Sender JID and Chat ID are always searchable (partial match). Phone,
            sender name, and chat name use encrypted indexes (exact match).
          </p>
        </div>
      )}
    </div>
  )
}

type SearchFieldProps = {
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  debounceMs?: number
  disabled?: boolean
  locked?: boolean
}

function SearchField({
  label,
  placeholder,
  value,
  onChange,
  debounceMs = 300,
  disabled = false,
  locked = false,
}: SearchFieldProps) {
  const [localValue, setLocalValue] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Sync local value when external value changes (e.g. clearing filters)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (disabled) {
      return
    }
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      onChangeRef.current(localValue)
    }, debounceMs)
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [localValue, debounceMs, disabled])

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1.5 text-xs font-medium text-secondary">
        {label}
        {locked && <LockIcon size={10} className="text-secondary" />}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        disabled={disabled}
        className={twMerge(
          "rounded-lg border border-zinc-200 bg-white py-1.5 px-2.5 text-sm placeholder:text-secondary focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-600",
          disabled &&
            "cursor-not-allowed opacity-50 bg-zinc-100 dark:bg-zinc-800"
        )}
      />
    </div>
  )
}
