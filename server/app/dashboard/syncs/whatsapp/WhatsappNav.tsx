"use client"

import { useRouter } from "next/navigation"
import { NavTabs } from "@/ui/indices/NavTabs"
import { PageHeader } from "@/ui/indices/PageHeader"
import { deleteAllWhatsappMessages } from "./(messages)/actions"

const subTabs = [
  { href: "/dashboard/syncs/whatsapp", label: "Messages" },
  { href: "/dashboard/syncs/whatsapp/chats", label: "Chats" },
] as const

export function WhatsappNav() {
  const router = useRouter()

  async function handleDeleteAll() {
    await deleteAllWhatsappMessages()
    router.refresh()
  }

  return (
    <>
      <PageHeader
        title="WhatsApp"
        onDeleteAll={handleDeleteAll}
        deleteConfirmMessage="Delete all WhatsApp data? This will permanently delete all WhatsApp messages from the database."
      />

      <NavTabs tabs={subTabs} rootHref="/dashboard/syncs/whatsapp" />
    </>
  )
}
