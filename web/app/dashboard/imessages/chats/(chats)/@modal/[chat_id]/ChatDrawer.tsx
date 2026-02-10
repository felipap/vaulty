"use client"

import { DemoBlur } from "@/ui/DemoBlur"
import { Drawer } from "@/ui/Drawer"
import { GroupIcon } from "@/ui/icons"
import { type ChatWithMessages, type ContactLookup } from "../../../actions"
import { Chat } from "./Chat"
import { resolveContactName, formatContact } from "./utils"

type Props = {
  chat: ChatWithMessages
  contactLookup: ContactLookup
}

export function ChatDrawer({ chat, contactLookup }: Props) {
  const chatTitle = getChatTitle(chat, contactLookup)

  return (
    <Drawer title={chatTitle}>
      <div className="space-y-4">
        <ChatInfo chat={chat} contactLookup={contactLookup} />
        <Chat
          chatId={chat.chatId}
          initialMessages={chat.messages}
          totalCount={chat.messageCount}
          contactLookup={contactLookup}
        />
      </div>
    </Drawer>
  )
}

function ChatInfo({
  chat,
  contactLookup,
}: {
  chat: ChatWithMessages
  contactLookup: ContactLookup
}) {
  return (
    <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <ChatAvatar chat={chat} />
        <div className="min-w-0 flex-1">
          {chat.isGroupChat ? (
            <>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Group Chat ({chat.participantCount} participants)
              </p>
              <DemoBlur>
                <p className="truncate text-xs text-zinc-500">
                  {chat.participants
                    .map((p) => resolveContactName(p, contactLookup))
                    .join(", ")}
                </p>
              </DemoBlur>
            </>
          ) : (
            <>
              <DemoBlur>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {resolveContactName(
                    chat.participants[0] || chat.chatId,
                    contactLookup
                  )}
                </p>
              </DemoBlur>
              <DemoBlur>
                <p className="text-xs text-zinc-500">
                  {formatContact(chat.participants[0] || chat.chatId)}
                </p>
              </DemoBlur>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-zinc-500">
        <span>{chat.messageCount.toLocaleString()} messages</span>
        {chat.lastMessageDate && (
          <span>
            Last: {new Date(chat.lastMessageDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}

function ChatAvatar({ chat }: { chat: ChatWithMessages }) {
  if (chat.isGroupChat) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
        <GroupIcon size={20} />
      </div>
    )
  }

  const name = chat.participants[0] || "?"
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
      {initial}
    </div>
  )
}

function getChatTitle(
  chat: ChatWithMessages,
  contactLookup: ContactLookup
): string {
  if (chat.isGroupChat) {
    return `Group Chat (${chat.participantCount})`
  }
  return resolveContactName(chat.participants[0] || chat.chatId, contactLookup)
}
