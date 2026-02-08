import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

export const DEFAULT_USER_ID = "default"

// Encrypted: data
export const Screenshots = pgTable("screenshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  // encrypted
  data: text("data").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type NewScreenshot = typeof Screenshots.$inferInsert
export type Screenshot = typeof Screenshots.$inferSelect

//
//
//
//

// Encrypted: text, subject
export const iMessages = pgTable(
  "imessages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    messageId: integer("message_id").notNull(),
    guid: text("guid").notNull().unique(),
    // encrypted
    text: text("text"),
    contact: text("contact").notNull(),
    // encrypted
    subject: text("subject"),
    date: timestamp("date"),
    isFromMe: boolean("is_from_me").notNull(),
    isRead: boolean("is_read").notNull(),
    isSent: boolean("is_sent").notNull(),
    isDelivered: boolean("is_delivered").notNull(),
    hasAttachments: boolean("has_attachments").notNull(),
    service: text("service").notNull(),
    chatId: text("chat_id"),
    chatName: text("chat_name"),
    deviceId: text("device_id").notNull(),
    syncTime: timestamp("sync_time").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("imessages_contact_idx").on(table.contact),
    index("imessages_chat_id_idx").on(table.chatId),
    index("imessages_date_idx").on(table.date),
  ]
)

export type NewMessage = typeof iMessages.$inferInsert
export type Message = typeof iMessages.$inferSelect

//
//
//
//

// Encrypted: dataBase64
export const iMessageAttachments = pgTable("imessage_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  messageGuid: text("message_guid").notNull(),
  attachmentId: text("attachment_id").notNull().unique(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size"),
  isImage: boolean("is_image"),
  // encrypted
  dataBase64: text("data_base64"),
  deviceId: text("device_id").notNull(),
  syncTime: timestamp("sync_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type NewIMessageAttachment = typeof iMessageAttachments.$inferInsert
export type IMessageAttachment = typeof iMessageAttachments.$inferSelect

//
//
//
//

export const WriteLogs = pgTable(
  "write_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(), // 'screenshot' | 'imessage' | 'attachment'
    description: text("description").notNull(),
    count: integer("count").notNull().default(1),
    metadata: text("metadata"), // JSON string for extra info
    accessTokenId: uuid("access_token_id").references(() => AccessTokens.id, {
      onDelete: "set null",
    }),
    tokenPrefix: text("token_prefix"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("write_logs_created_at_idx").on(table.createdAt)]
)

export type NewWriteLog = typeof WriteLogs.$inferInsert
export type WriteLog = typeof WriteLogs.$inferSelect

//
//
//
//

export const ReadLogs = pgTable(
  "read_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(), // 'screenshot' | 'imessage' | 'chat' | 'contact' | 'stats'
    description: text("description").notNull(),
    count: integer("count"), // number of items returned
    metadata: text("metadata"), // JSON string for extra info
    accessTokenId: uuid("access_token_id").references(() => AccessTokens.id, {
      onDelete: "set null",
    }),
    tokenPrefix: text("token_prefix"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("read_logs_created_at_idx").on(table.createdAt)]
)

export type NewReadLog = typeof ReadLogs.$inferInsert
export type ReadLog = typeof ReadLogs.$inferSelect

//
//
//
//

// Encrypted: firstName, lastName, organization, emails, phoneNumbers
export const Contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    contactId: text("contact_id").notNull(), // The unique ID from the contacts database
    // encrypted
    firstName: text("first_name"),
    // encrypted
    lastName: text("last_name"),
    // encrypted
    organization: text("organization"),
    // encrypted, JSON array
    emails: text("emails").notNull(),
    // encrypted, JSON array
    phoneNumbers: text("phone_numbers").notNull(),
    deviceId: text("device_id").notNull(),
    syncTime: timestamp("sync_time").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("contacts_user_contact_unique").on(table.userId, table.contactId),
    index("contacts_user_id_idx").on(table.userId),
  ]
)

export type NewContact = typeof Contacts.$inferInsert
export type Contact = typeof Contacts.$inferSelect

//
//
//
//

export type LocationMetadata = {
  source?: string
}

// Encrypted: latitude, longitude
export const Locations = pgTable(
  "locations",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    timestamp: timestamp("timestamp").notNull(),
    // encrypted
    latitude: text("latitude").notNull(),
    // encrypted
    longitude: text("longitude").notNull(),
    accuracy: integer("accuracy"),
    metadata: jsonb("metadata").$type<LocationMetadata>(),
  },
  (table) => [index("locations_timestamp_idx").on(table.timestamp)]
)

export type NewLocation = typeof Locations.$inferInsert
export type Location = typeof Locations.$inferSelect

//
//
//
//

// Encrypted: text, chatName, senderName, senderPhoneNumber
export const WhatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    messageId: text("message_id").notNull().unique(), // Unipile message ID
    chatId: text("chat_id").notNull(),
    // encrypted
    chatName: text("chat_name"),
    // HMAC blind index
    chatNameIndex: text("chat_name_index"),
    // encrypted
    text: text("text"),
    // Null for messages from me (outgoing); required for others
    senderJid: text("sender_jid"),
    // encrypted
    senderName: text("sender_name"),
    // HMAC blind index
    senderNameIndex: text("sender_name_index"),
    // encrypted
    senderPhoneNumber: text("sender_phone_number"),
    // HMAC blind index
    senderPhoneNumberIndex: text("sender_phone_number_index"),
    timestamp: timestamp("timestamp").notNull(),
    isFromMe: boolean("is_from_me").notNull(),
    isGroupChat: boolean("is_group_chat").notNull(),
    deviceId: text("device_id").notNull(),
    syncTime: timestamp("sync_time").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("whatsapp_messages_chat_id_idx").on(table.chatId),
    index("whatsapp_messages_sender_jid_idx").on(table.senderJid),
    index("whatsapp_messages_timestamp_idx").on(table.timestamp),
    index("whatsapp_messages_chat_name_index_idx").on(table.chatNameIndex),
    index("whatsapp_messages_sender_name_index_idx").on(table.senderNameIndex),
    index("whatsapp_messages_sender_phone_index_idx").on(
      table.senderPhoneNumberIndex
    ),
  ]
)

export type NewWhatsappMessage = typeof WhatsappMessages.$inferInsert
export type WhatsappMessage = typeof WhatsappMessages.$inferSelect

//
//
//
//

export const AccessTokens = pgTable("access_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  tokenPrefix: text("token_prefix").notNull(), // e.g. "ctx_a1b2c3d4" for display
  scopes: text("scopes").array().notNull().default([]),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type NewAccessToken = typeof AccessTokens.$inferInsert
export type AccessToken = typeof AccessTokens.$inferSelect

//
//
//
//

export const LoginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ip: text("ip").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("login_attempts_ip_idx").on(table.ip),
    index("login_attempts_attempted_at_idx").on(table.attemptedAt),
  ]
)
