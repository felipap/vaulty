"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  getChats,
  getContactLookup,
  type Chat,
  type ContactLookup,
} from "../actions"
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"
import { ChatsTable, type DecryptedChat } from "../ChatsTable"
import { SearchIcon } from "@/ui/icons"

export default function Page() {
  const [chats, setChats] = useState<DecryptedChat[]>([])
  const [contactLookup, setContactLookup] = useState<ContactLookup>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")

  const decryptChats = useCallback(
    async (chatList: Chat[]): Promise<DecryptedChat[]> => {
      const encryptionKey = getEncryptionKey()
      return Promise.all(
        chatList.map(async (chat) => {
          if (!chat.lastMessageText || !isEncrypted(chat.lastMessageText)) {
            return { ...chat, decryptedLastMessage: chat.lastMessageText }
          }
          if (!encryptionKey) {
            return { ...chat, decryptedLastMessage: null }
          }
          const decrypted = await decryptText(
            chat.lastMessageText,
            encryptionKey
          )
          return { ...chat, decryptedLastMessage: decrypted }
        })
      )
    },
    []
  )

  // Fetch contacts once on mount
  useEffect(() => {
    getContactLookup().then(setContactLookup)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getChats(page, 20, search)
      const decrypted = await decryptChats(data.chats)
      setChats(decrypted)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, search, decryptChats])

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <SearchInput
            placeholder="Search by phone number..."
            onChange={handleSearchChange}
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
          {search ? "No chats match your search." : "No chats yet."}
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
        className="w-[300px] rounded-lg border border-zinc-200 bg-white py-2 pl-7 pr-3 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-600 text-sm"
      />
    </div>
  )
}
