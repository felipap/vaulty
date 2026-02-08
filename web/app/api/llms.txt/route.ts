const LLMS_TXT = `# Vaulty API

> Personal data sync API for contacts, iMessages, WhatsApp messages, screenshots, and locations. All message content and attachments are end-to-end encrypted.

## Encryption

- Text fields must be prefixed with \`enc:v1:\`
- Binary data (screenshots) must start with \`CTXE\` magic bytes

## Endpoints

### Contacts
- GET /api/contacts - List all contacts
- POST /api/contacts - Sync contacts from device
- GET /api/contacts/{phone} - Get contact by phone number
- GET /api/contacts/search?q={query} - Search contacts by name

### iMessages
- GET /api/imessages - List messages (params: limit, offset, after, contact)
- POST /api/imessages - Sync encrypted messages from device
- GET /api/imessages/chats - List chats with last message and participant info
- GET /api/imessages/chats/{chat_id} - Get chat details
- GET /api/imessages/chats/{chat_id}/messages - Get messages in a chat
- GET /api/imessages/with/{phone} - Get conversation with a contact

### WhatsApp
- GET /api/whatsapp-messages - List messages (params: limit, offset, after, chatId)
- POST /api/whatsapp-messages - Sync encrypted messages from device

### Screenshots
- POST /api/screenshots - Upload encrypted screenshot (multipart/form-data)
- GET /api/screenshots/latest - Get latest screenshot (param: within_min)

### Locations
- GET /api/locations/latest - Get latest location (param: within_min)

## Notes

- All endpoints require authentication via Bearer token
- Message text, subjects, sender names, and attachments must be encrypted before sync
- Pagination uses limit/offset pattern (max limit: 50)
- Dates are ISO 8601 format
`

import { requireReadAuth } from "@/lib/api-auth"

export async function GET(request: Request) {
  const auth = await requireReadAuth(request)
  if (!auth.authorized) {
    return auth.response
  }

  return new Response(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
