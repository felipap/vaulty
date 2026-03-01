import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core"

// Encrypted: data
export const Screenshots = sqliteTable("screenshots", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  // encrypted
  data: text("data").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  capturedAt: integer("captured_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export type NewScreenshot = typeof Screenshots.$inferInsert
export type Screenshot = typeof Screenshots.$inferSelect

//
//
//
//

// Encrypted: text, subject, contact, chatName
export const iMessages = sqliteTable(
  "imessages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    deviceId: text("device_id").notNull(),
    syncTime: integer("sync_time", { mode: "timestamp_ms" }).notNull(),
    //
    messageId: integer("message_id").notNull(),
    guid: text("guid").notNull().unique(),
    // encrypted
    text: text("text"),
    // encrypted
    contact: text("contact").notNull(),
    // HMAC blind index
    contactIndex: text("contact_index"),
    // encrypted
    subject: text("subject"),
    date: integer("date", { mode: "timestamp_ms" }),
    isFromMe: integer("is_from_me", { mode: "boolean" }).notNull(),
    isRead: integer("is_read", { mode: "boolean" }).notNull(),
    isSent: integer("is_sent", { mode: "boolean" }).notNull(),
    isDelivered: integer("is_delivered", { mode: "boolean" }).notNull(),
    hasAttachments: integer("has_attachments", { mode: "boolean" }).notNull(),
    service: text("service").notNull(),
    chatId: text("chat_id"),
    chatName: text("chat_name"),
  },
  (table) => [
    index("imessages_contact_index_idx").on(table.contactIndex),
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
export const iMessageAttachments = sqliteTable("imessage_attachments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  deviceId: text("device_id").notNull(),
  syncTime: integer("sync_time", { mode: "timestamp_ms" }).notNull(),
  userId: text("user_id").notNull(),
  //
  messageGuid: text("message_guid").notNull(),
  attachmentId: text("attachment_id").notNull().unique(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size"),
  isImage: integer("is_image", { mode: "boolean" }),
  // encrypted
  dataBase64: text("data_base64"),
})

export type NewIMessageAttachment = typeof iMessageAttachments.$inferInsert
export type IMessageAttachment = typeof iMessageAttachments.$inferSelect

//
//
//
//

// Encrypted: firstName, lastName, organization, emails, phoneNumbers
export const AppleContacts = sqliteTable(
  "apple_contacts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    deviceId: text("device_id").notNull(),
    syncTime: integer("sync_time", { mode: "timestamp_ms" }).notNull(),
    //
    contactId: text("contact_id").notNull(),
    // encrypted
    firstName: text("first_name").notNull(),
    // encrypted
    lastName: text("last_name"),
    // HMAC blind index for first name search
    firstNameIndex: text("first_name_index"),
    // HMAC blind index for last name search
    lastNameIndex: text("last_name_index"),
    // encrypted
    organization: text("organization"),
    // encrypted, JSON array
    emails: text("emails").notNull(),
    // encrypted, JSON array
    phoneNumbers: text("phone_numbers").notNull(),
    // HMAC blind indexes for phone search (one per phone number), stored as JSON array
    phoneNumbersIndex: text("phone_numbers_index", { mode: "json" }).$type<
      string[] | null
    >(),
  },
  (table) => [
    unique("contacts_user_contact_unique").on(table.userId, table.contactId),
    index("contacts_user_id_idx").on(table.userId),
    index("contacts_first_name_index_idx").on(table.firstNameIndex),
    index("contacts_last_name_index_idx").on(table.lastNameIndex),
  ]
)

export type NewAppleContact = typeof AppleContacts.$inferInsert
export type AppleContact = typeof AppleContacts.$inferSelect

//
//
//
//

export type LocationMetadata = {
  source?: string
}

// Encrypted: latitude, longitude
export const Locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
    // encrypted
    latitude: text("latitude").notNull(),
    // encrypted
    longitude: text("longitude").notNull(),
    accuracy: integer("accuracy"),
    metadata: text("metadata", { mode: "json" }).$type<LocationMetadata>(),
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
export const WhatsappMessages = sqliteTable(
  "whatsapp_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    syncTime: integer("sync_time", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    deviceId: text("device_id").notNull(),
    //
    messageId: text("message_id").notNull().unique(),
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
    timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
    isFromMe: integer("is_from_me", { mode: "boolean" }).notNull(),
    isGroupChat: integer("is_group_chat", { mode: "boolean" }).notNull(),
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

// Encrypted: text
export const MacosStickies = sqliteTable("macos_stickies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  deviceId: text("device_id").notNull(),
  stickyId: text("sticky_id").notNull().unique(),
  // encrypted
  text: text("text").notNull(),
  syncTime: integer("sync_time", { mode: "timestamp_ms" }).notNull(),
})

export type NewMacosSticky = typeof MacosStickies.$inferInsert
export type MacosSticky = typeof MacosStickies.$inferSelect

// Encrypted: text
export const WinStickyNotes = sqliteTable("win_sticky_notes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  deviceId: text("device_id").notNull(),
  //
  stickyId: text("sticky_id").notNull().unique(),
  // encrypted
  text: text("text").notNull(),
  syncTime: integer("sync_time", { mode: "timestamp_ms" }).notNull(),
})

export type NewWinStickyNote = typeof WinStickyNotes.$inferInsert
export type WinStickyNote = typeof WinStickyNotes.$inferSelect

//
//
//
//

// Encrypted: title, body
export const AppleNotes = sqliteTable("apple_notes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  deviceId: text("device_id").notNull(),
  noteId: integer("note_id").notNull().unique(),
  // encrypted
  title: text("title").notNull(),
  // encrypted
  body: text("body").notNull(),
  folderName: text("folder_name"),
  accountName: text("account_name"),
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
  noteCreatedAt: text("note_created_at").notNull(),
  noteModifiedAt: text("note_modified_at").notNull(),
  syncTime: integer("sync_time", { mode: "timestamp_ms" }).notNull(),
})

export type NewAppleNote = typeof AppleNotes.$inferInsert
export type AppleNote = typeof AppleNotes.$inferSelect

//
//
//
//

// Encrypted: title, notes, listName
export const AppleReminders = sqliteTable("apple_reminders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  deviceId: text("device_id").notNull(),
  //
  reminderId: text("reminder_id").notNull().unique(),
  // encrypted
  title: text("title").notNull(),
  // encrypted
  notes: text("notes"),
  // encrypted
  listName: text("list_name"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  flagged: integer("flagged", { mode: "boolean" }).notNull().default(false),
  priority: integer("priority").notNull().default(0),
  dueDate: integer("due_date", { mode: "timestamp_ms" }),
  completionDate: integer("completion_date", { mode: "timestamp_ms" }),
  reminderCreatedAt: integer("reminder_created_at", { mode: "timestamp_ms" }),
  reminderModifiedAt: integer("reminder_modified_at", { mode: "timestamp_ms" }),
  syncTime: integer("sync_time", { mode: "timestamp_ms" }).notNull(),
})

export type NewAppleReminder = typeof AppleReminders.$inferInsert
export type AppleReminderRow = typeof AppleReminders.$inferSelect

//
//
//
//

export const WriteJobs = sqliteTable(
  "write_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    //
    type: text("type").notNull(),
    status: text("status", {
      enum: ["pending", "claimed", "completed", "failed", "expired"],
    })
      .notNull()
      .default("pending"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    payload: text("payload", { mode: "json" }).notNull(),
    claimedAt: integer("claimed_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    claimedByDeviceId: text("claimed_by_device_id"),
    error: text("error"),
    accessTokenId: text("access_token_id"),
    tokenPrefix: text("token_prefix"),
  },
  (table) => [
    index("write_jobs_status_idx").on(table.status),
    index("write_jobs_type_idx").on(table.type),
    index("write_jobs_created_at_idx").on(table.createdAt),
  ]
)

export type NewWriteJob = typeof WriteJobs.$inferInsert
export type WriteJob = typeof WriteJobs.$inferSelect
