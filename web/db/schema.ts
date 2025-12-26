import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

export const DEFAULT_USER_ID = "default"

export const Screenshots = pgTable("screenshots", {
  id: uuid("id").defaultRandom().primaryKey(),
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

export const iMessages = pgTable(
  "imessages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    messageId: integer("message_id").notNull(),
    guid: text("guid").notNull().unique(),
    text: text("text"),
    contact: text("contact").notNull(),
    subject: text("subject"),
    date: timestamp("date"),
    isFromMe: integer("is_from_me").notNull(),
    isRead: integer("is_read").notNull(),
    isSent: integer("is_sent").notNull(),
    isDelivered: integer("is_delivered").notNull(),
    hasAttachments: integer("has_attachments").notNull(),
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

export const iMessageAttachments = pgTable("imessage_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  messageGuid: text("message_guid").notNull(),
  attachmentId: text("attachment_id").notNull().unique(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size"),
  isImage: integer("is_image"),
  dataBase64: text("data_base64"),
  deviceId: text("device_id").notNull(),
  syncTime: timestamp("sync_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type NewIMessageAttachment = typeof iMessageAttachments.$inferInsert
export type IMessageAttachment = typeof iMessageAttachments.$inferSelect
