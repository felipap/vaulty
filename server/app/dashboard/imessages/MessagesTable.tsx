"use client"

import { ArrowDownIcon, ArrowUpIcon, LockIcon } from "@/ui/icons"
import { Pagination } from "@/ui/Pagination"
import { isEncrypted } from "@/lib/encryption"
import { type Message } from "./(messages)/actions"

export type DecryptedMessage = Message & {
  decryptedText: string | null
  decryptedContact: string
}

type Props = {
  messages: DecryptedMessage[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function MessagesTable({ messages, page, totalPages, onPageChange }: Props) {
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Direction
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Message
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {messages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </>
  )
}

function MessageRow({ message }: { message: DecryptedMessage }) {
  const isMessageEncrypted = isEncrypted(message.text)
  const displayText = message.decryptedText

  return (
    <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <td className="px-4 py-3">
        <DirectionBadge isFromMe={message.isFromMe} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ServiceIcon service={message.service} />
          <span className="text-sm">{formatContact(message.decryptedContact)}</span>
        </div>
      </td>
      <td className="max-w-[300px] truncate px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
        {displayText ? (
          <span className="flex items-center gap-1.5">
            {isMessageEncrypted && (
              <span className="text-green-500" title="Decrypted">
                <LockIcon size={12} />
              </span>
            )}
            {displayText}
          </span>
        ) : isMessageEncrypted ? (
          <span className="flex items-center gap-1.5 italic text-amber-500">
            <LockIcon size={12} />
            Encrypted - enter key to decrypt
          </span>
        ) : (
          <span className="italic text-zinc-400">
            {message.hasAttachments ? "📎 Attachment" : "No content"}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500">
        {message.date ? new Date(message.date).toLocaleString() : "—"}
      </td>
    </tr>
  )
}

function DirectionBadge({ isFromMe }: { isFromMe: boolean }) {
  if (isFromMe) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <ArrowUpIcon />
        Sent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <ArrowDownIcon />
      Received
    </span>
  )
}

function ServiceIcon({ service }: { service: string }) {
  const isIMessage = service === "iMessage"

  return (
    <div
      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
        isIMessage ? "bg-blue-500 text-white" : "bg-green-500 text-white"
      }`}
      title={service}
    >
      {isIMessage ? "i" : "S"}
    </div>
  )
}

function formatContact(contact: string): string {
  if (contact.includes("@")) {
    return contact
  }
  if (contact.startsWith("+")) {
    const digits = contact.slice(1)
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    return contact
  }
  return contact
}
