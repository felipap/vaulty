import { z } from "zod"

export const ENCRYPTED_PREFIX = "enc:v1:"

export function isServerEncrypted(text: string): boolean {
  return text.startsWith(ENCRYPTED_PREFIX)
}

export const encryptedOrEmpty = z
  .string()
  .refine((s) => s === "" || isServerEncrypted(s), {
    message: "must be encrypted (missing enc:v1: prefix)",
  })

export const encryptedRequired = z
  .string()
  .refine((s) => isServerEncrypted(s), {
    message: "must be encrypted (missing enc:v1: prefix)",
  })

export const SCREENSHOT_ENCRYPTED_COLUMNS = ["data"] as const

export const IMESSAGE_ENCRYPTED_COLUMNS = [
  "text",
  "subject",
  "contact",
] as const

export const ATTACHMENT_ENCRYPTED_COLUMNS = ["dataBase64"] as const

export const CONTACT_ENCRYPTED_COLUMNS = [
  "firstName",
  "lastName",
  "organization",
  "emails",
  "phoneNumbers",
] as const

export const LOCATION_ENCRYPTED_COLUMNS = ["latitude", "longitude"] as const

export const WHATSAPP_ENCRYPTED_COLUMNS = [
  "text",
  "chatName",
  "senderName",
  "senderPhoneNumber",
] as const

export const APPLE_NOTES_ENCRYPTED_COLUMNS = ["title", "body"] as const

export const APPLE_REMINDERS_ENCRYPTED_COLUMNS = [
  "title",
  "notes",
  "listName",
] as const

export const MACOS_STICKIES_ENCRYPTED_COLUMNS = ["text"] as const

export const WIN_STICKY_NOTES_ENCRYPTED_COLUMNS = ["text"] as const
