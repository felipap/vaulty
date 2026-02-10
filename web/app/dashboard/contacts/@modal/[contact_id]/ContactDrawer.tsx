"use client"

import { DemoBlur } from "@/ui/DemoBlur"
import { Drawer } from "@/ui/Drawer"
import { InfoRow } from "@/ui/InfoRow"
import { RawJson } from "@/ui/RawJson"
import { PhoneIcon, MailIcon } from "@/ui/icons"
import { type ContactDetail } from "../../actions"

type Props = {
  contact: ContactDetail
}

export function ContactDrawer({ contact }: Props) {
  const displayName = getDisplayName(contact)
  const initial = getInitial(displayName)
  const bgColor = getAvatarColor(contact.id)

  return (
    <Drawer title="Contact Details">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-medium ${bgColor}`}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <DemoBlur>{displayName}</DemoBlur>
            </p>
            {contact.organization && displayName !== contact.organization && (
              <p className="text-sm text-zinc-500">{contact.organization}</p>
            )}
          </div>
        </div>

        {contact.phoneNumbers.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-500">
              Phone Numbers
            </label>
            <div className="space-y-2">
              {contact.phoneNumbers.map((phone, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <PhoneIcon size={16} className="shrink-0 text-zinc-400" />
                  <span className="text-sm text-zinc-800 dark:text-zinc-200">
                    <DemoBlur>{formatPhone(phone)}</DemoBlur>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {contact.emails.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-500">
              Emails
            </label>
            <div className="space-y-2">
              {contact.emails.map((email, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <MailIcon size={16} className="shrink-0 text-zinc-400" />
                  <span className="text-sm text-zinc-800 dark:text-zinc-200">
                    {email}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <InfoRow label="Contact ID" value={contact.contactId} copyable />
          <InfoRow label="Device" value={contact.deviceId} copyable />
          <InfoRow
            label="Last Synced"
            value={new Date(contact.syncTime).toLocaleString()}
          />
          <InfoRow
            label="Created"
            value={new Date(contact.createdAt).toLocaleString()}
          />
          <InfoRow
            label="Updated"
            value={new Date(contact.updatedAt).toLocaleString()}
          />
        </div>
      </div>
      <RawJson data={contact} />
    </Drawer>
  )
}

function getDisplayName(contact: ContactDetail): string {
  if (contact.firstName || contact.lastName) {
    return [contact.firstName, contact.lastName].filter(Boolean).join(" ")
  }
  if (contact.organization) {
    return contact.organization
  }
  if (contact.emails && contact.emails.length > 0) {
    return contact.emails[0]
  }
  if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
    return contact.phoneNumbers[0]
  }
  return "Unknown"
}

function getInitial(name: string): string {
  if (name.includes("@")) {
    return name.charAt(0).toUpperCase()
  }
  if (name.startsWith("+") || /^\d/.test(name)) {
    return "#"
  }
  return name.charAt(0).toUpperCase()
}

function formatPhone(phone: string): string {
  if (phone.startsWith("+1") && phone.length === 12) {
    return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`
  }
  return phone
}

const avatarColors = [
  "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}
