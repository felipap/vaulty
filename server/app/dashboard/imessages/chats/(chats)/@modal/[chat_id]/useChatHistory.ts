"use client"

import { useEffect, useState, useTransition } from "react"
import {
  decryptText,
  isEncrypted,
  getEncryptionKey,
} from "@/lib/encryption"
import { type ChatMessage, getChatMessages } from "../../../actions"

export type DecryptedMessage = ChatMessage & {
  decryptedText: string | null
  decryptedContact: string
}

type UseChatHistoryOptions = {
  chatId: string
  initialMessages: ChatMessage[]
  totalCount: number
}

export function useChatHistory({ chatId, initialMessages, totalCount }: UseChatHistoryOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([])
  const [hasMore, setHasMore] = useState(initialMessages.length < totalCount)
  const [isPending, startTransition] = useTransition()

  const remainingCount = totalCount - messages.length

  useEffect(() => {
    async function decryptMessages() {
      const key = getEncryptionKey()
      const decrypted = await Promise.all(
        messages.map(async (msg) => {
          let decryptedText: string | null = msg.text
          if (msg.text && isEncrypted(msg.text)) {
            decryptedText = key ? await decryptText(msg.text, key) : null
          }

          let decryptedContact = msg.contact
          if (isEncrypted(msg.contact) && key) {
            decryptedContact =
              (await decryptText(msg.contact, key)) ?? msg.contact
          }

          return { ...msg, decryptedText, decryptedContact }
        })
      )
      setDecryptedMessages(decrypted)
    }
    decryptMessages()
  }, [messages])

  function loadMore() {
    startTransition(async () => {
      const result = await getChatMessages(chatId, messages.length)
      setMessages((prev) => [...prev, ...result.messages])
      setHasMore(result.hasMore)
    })
  }

  return {
    messages: decryptedMessages,
    isLoading: decryptedMessages.length === 0,
    isPending,
    hasMore,
    remainingCount,
    loadMore,
  }
}
