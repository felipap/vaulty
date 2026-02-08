"use client"

import { useEffect, useState, useCallback } from "react"
import {
  getChats,
  getContactLookup,
  type Chat,
  type ContactLookup,
  type ChatSearchParams,
} from "./actions"
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"

export type DecryptedChat = Chat & { decryptedLastMessage: string | null }

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

function buildSearchParams(filters: ChatFilters): ChatSearchParams {
  const params: ChatSearchParams = {}

  if (filters.contact) {
    params.contact = filters.contact
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
      const searchParams = buildSearchParams(filters)
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
