"use client"

import { useRouter } from "next/navigation"
import { DeleteAllButton } from "@/ui/DeleteAllButton"
import { NavTabs } from "@/ui/NavTabs"
import { PageHeader } from "@/ui/PageHeader"
import { deleteAllIMessages } from "./(messages)/actions"

const subTabs = [
  { href: "/dashboard/imessages", label: "Messages" },
  { href: "/dashboard/imessages/chats", label: "Chats" },
] as const

export function IMessagesNav() {
  const router = useRouter()

  async function handleDeleteAll() {
    await deleteAllIMessages()
    router.refresh()
  }

  return (
    <>
      <PageHeader title="iMessages">
        <DeleteAllButton
          confirmMessage="Delete all iMessages data? This will permanently delete all iMessages and attachments from the database."
          onDelete={handleDeleteAll}
        />
      </PageHeader>

      <NavTabs tabs={subTabs} rootHref="/dashboard/imessages" />
    </>
  )
}
