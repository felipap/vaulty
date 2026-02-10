"use client"

import { Decrypted } from "@/ui/Decrypted"
import { DemoBlur } from "@/ui/DemoBlur"
import { Drawer } from "@/ui/Drawer"
import { InfoRow } from "@/ui/InfoRow"
import { RawJson } from "@/ui/RawJson"
import { type Route } from "next"
import Link from "next/link"
import { type WhatsappMessageDetail } from "../../actions"

type Props = {
  message: WhatsappMessageDetail
}

export function MessageDrawer({ message }: Props) {
  const chatHref =
    `/dashboard/whatsapp/chats/${encodeURIComponent(message.chatId)}` as Route

  return (
    <Drawer title="Message Details">
      <div className="space-y-4">
        <InfoRow label="Message ID" value={message.messageId} copyable />
        <DemoBlur>
          <InfoRow
            label="Sender"
            value={message.senderName ?? message.senderJid ?? ""}
          />
        </DemoBlur>
        {message.senderName && message.senderJid && (
          <DemoBlur>
            <InfoRow label="JID" value={message.senderJid} copyable />
          </DemoBlur>
        )}
        <InfoRow
          label="Direction"
          value={message.isFromMe ? "Sent" : "Received"}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-500">
            Chat
          </label>
          <Link
            href={chatHref}
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            {message.chatName ? (
              <Decrypted>{message.chatName}</Decrypted>
            ) : (
              message.chatId
            )}
          </Link>
        </div>
        <InfoRow
          label="Date"
          value={new Date(message.timestamp).toLocaleString()}
        />
        <InfoRow
          label="Synced"
          value={new Date(message.syncTime).toLocaleString()}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-500">
            Message
          </label>
          <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
            <Decrypted showLockIcon>{message.text}</Decrypted>
          </div>
        </div>
      </div>
      <RawJson data={message} />
    </Drawer>
  )
}
