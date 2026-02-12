"use client"

import { useRouter } from "next/navigation"
import { DeleteAllButton } from "@/ui/DeleteAllButton"
import { NavTabs } from "@/ui/NavTabs"
import { deleteAllWhatsappMessages } from "./(messages)/actions"

const subTabs = [
  { href: "/dashboard/whatsapp", label: "Messages" },
  { href: "/dashboard/whatsapp/chats", label: "Chats" },
] as const

export function WhatsappNav() {
  const router = useRouter()

  async function handleDeleteAll() {
    await deleteAllWhatsappMessages()
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="heading-page">WhatsApp</h1>
        <DeleteAllButton
          confirmMessage="Delete all WhatsApp data? This will permanently delete all WhatsApp messages from the database."
          onDelete={handleDeleteAll}
        />
      </div>

      <NavTabs tabs={subTabs} rootHref="/dashboard/whatsapp" />
    </>
  )
}
