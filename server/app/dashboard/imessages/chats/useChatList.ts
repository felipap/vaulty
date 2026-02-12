"use client"

import { useEffect, useState, useCallback } from "react"
import {
  getChats,
  getContactLookup,
  type Chat,
  type ContactLookup,
  type ChatSearchParams,
} from "./actions"
import {
  maybeDecrypt,
  getEncryptionKey,
  computeSearchIndex,
} from "@/lib/encryption"
import { normalizeContactForSearch } from "@/lib/search-normalize"

export type DecryptedChat = Chat & {
  decryptedLastMessage: string | null
  decryptedParticipants: string[]
}

export type ChatFilters = {
  contact: string
  chatId: string
}

export const emptyChatFilters: ChatFilters = {
  contact: "",
  chatId: "",
}

type UseChatListOptions = {
  pageSize?: number
}

async function buildSearchParams(
  filters: ChatFilters
): Promise<ChatSearchParams> {
  const params: ChatSearchParams = {}

  if (filters.contact) {
    const key = getEncryptionKey()
    if (key) {
      const normalized = normalizeContactForSearch(filters.contact)
      if (normalized) {
        params.contactIndex = await computeSearchIndex(normalized, key)
      }
    }
  }
  if (filters.chatId) {
    params.chatId = filters.chatId
  }

  return params
}

export function useChatList(options: UseChatListOptions = {}) {
  const { pageSize = 20 } = options

  const [chats, setChats] = useState<DecryptedChat[]>([])
  const [contactLookup, setContactLookup] = useState<ContactLookup>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<ChatFilters>(emptyChatFilters)

  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0)

  const decryptChats = useCallback(
    async (chatList: Chat[]): Promise<DecryptedChat[]> => {
      return Promise.all(
        chatList.map(async (chat) => {
          const decryptedLastMessage = await maybeDecrypt(chat.lastMessageText)
          const decryptedParticipants = await Promise.all(
            chat.participants.map(async (p) => {
              const decrypted = await maybeDecrypt(p)
              return decrypted ?? p
            })
          )
          return { ...chat, decryptedLastMessage, decryptedParticipants }
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
      const searchParams = await buildSearchParams(filters)
      const data = await getChats(page, pageSize, searchParams)
      const decrypted = await decryptChats(data.chats)
      setChats(decrypted)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, pageSize, filters, decryptChats])

  const handleFilterChange = useCallback(
    (field: keyof ChatFilters, value: string) => {
      setFilters((prev) => {
        if (prev[field] === value) {
          return prev
        }
        return { ...prev, [field]: value }
      })
      setPage(1)
    },
    []
  )

  const clearFilters = useCallback(() => {
    setFilters(emptyChatFilters)
    setPage(1)
  }, [])

  return {
    chats,
    contactLookup,
    loading,
    page,
    totalPages,
    total,
    filters,
    hasActiveFilters,
    setPage,
    setFilter: handleFilterChange,
    clearFilters,
  }
}
