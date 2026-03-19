"use client"

import { useRouter } from "next/navigation"
import { NavTabs } from "@/ui/indices/NavTabs"
import { PageHeader } from "@/ui/indices/PageHeader"
import { deleteAllIMessages } from "./(messages)/actions"

const subTabs = [
  { href: "/dashboard/syncs/imessages", label: "Messages" },
  { href: "/dashboard/syncs/imessages/chats", label: "Chats" },
] as const

export function IMessagesNav() {
  const router = useRouter()

  async function handleDeleteAll() {
    await deleteAllIMessages()
    router.refresh()
  }

  return (
    <>
      <PageHeader
        title="iMessages"
        onDeleteAll={handleDeleteAll}
        deleteConfirmMessage="Delete all iMessages data? This will permanently delete all iMessages and attachments from the database."
      />

      <NavTabs tabs={subTabs} rootHref="/dashboard/syncs/imessages" />
    </>
  )
}
