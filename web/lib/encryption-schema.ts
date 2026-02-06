// Defines which columns in each table can be encrypted
// This helps the API routes and frontend know which fields to expect encryption on

export const SCREENSHOT_ENCRYPTED_COLUMNS = ["data"] as const

export const IMESSAGE_ENCRYPTED_COLUMNS = ["text", "subject"] as const

export const ATTACHMENT_ENCRYPTED_COLUMNS = ["dataBase64"] as const

export const CONTACT_ENCRYPTED_COLUMNS = [
  "firstName",
  "lastName",
  "organization",
  "emails",
  "phoneNumbers",
] as const

export const LOCATION_ENCRYPTED_COLUMNS = ["latitude", "longitude"] as const

export const WHATSAPP_ENCRYPTED_COLUMNS = ["text", "chatName", "senderName", "senderPhoneNumber"] as const
