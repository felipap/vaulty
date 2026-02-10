"use client"

import { twMerge } from "tailwind-merge"
import { DemoBlur } from "@/ui/DemoBlur"
import { LockIcon, LoaderIcon, CheckIcon } from "@/ui/icons"
import { isEncrypted } from "@/lib/encryption"
import { type ChatMessage, type ContactLookup } from "../../../actions"
import { useChatHistory, type DecryptedMessage } from "./useChatHistory"
import { resolveContactName } from "./utils"

type Props = {
  chatId: string
  initialMessages: ChatMessage[]
  totalCount: number
  contactLookup: ContactLookup
}

export function Chat({
  chatId,
  initialMessages,
  totalCount,
  contactLookup,
}: Props) {
  const { messages, isLoading, isPending, hasMore, remainingCount, loadMore } =
    useChatHistory({ chatId, initialMessages, totalCount })

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-500">
        Messages ({messages.length} of {totalCount})
      </label>
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading messages...</p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              contactLookup={contactLookup}
            />
          ))
        )}
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {isPending ? (
              <>
                <LoaderIcon size={16} className="animate-spin" />
                Loading...
              </>
            ) : (
              `Load older messages (${remainingCount.toLocaleString()} remaining)`
            )}
          </button>
        ) : messages.length > 0 ? (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-zinc-400 dark:text-zinc-500">
            <CheckIcon size={16} />
            All messages loaded
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  contactLookup,
}: {
  message: DecryptedMessage
  contactLookup: ContactLookup
}) {
  const isEncryptedMsg = message.text ? isEncrypted(message.text) : false
  const hasDecrypted = !!message.decryptedText

  return (
    <div
      className={twMerge(
        "flex",
        message.isFromMe ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={twMerge(
          "max-w-[85%] rounded-lg px-3 py-2",
          message.isFromMe
            ? "bg-blue-500 text-white"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        )}
      >
        {!message.isFromMe && (
          <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <DemoBlur>{resolveContactName(message.contact, contactLookup)}</DemoBlur>
          </p>
        )}
        <div className="flex items-start gap-1.5">
          {isEncryptedMsg && hasDecrypted && (
            <span
              className={twMerge(
                "mt-0.5",
                message.isFromMe ? "text-blue-200" : "text-green-500"
              )}
              title="Decrypted"
            >
              <LockIcon size={12} />
            </span>
          )}
          {message.decryptedText ? (
            <p className="whitespace-pre-wrap text-sm wrap-break-word">
              {message.decryptedText}
            </p>
          ) : isEncryptedMsg ? (
            <p
              className={twMerge(
                "text-sm italic",
                message.isFromMe ? "text-blue-200" : "text-amber-500"
              )}
            >
              Encrypted
            </p>
          ) : message.hasAttachments ? (
            <p className="text-sm italic">📎 Attachment</p>
          ) : (
            <p className="text-sm italic opacity-60">No content</p>
          )}
        </div>
        {message.date && (
          <p
            className={twMerge(
              "mt-1 text-[10px]",
              message.isFromMe
                ? "text-blue-200"
                : "text-zinc-400 dark:text-zinc-500"
            )}
          >
            {new Date(message.date).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  )
}
