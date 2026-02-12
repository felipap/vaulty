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

// Encrypted: data
export const Screenshots = pgTable("screenshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // encrypted
  data: text("data").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
})

export type NewScreenshot = typeof Screenshots.$inferInsert
export type Screenshot = typeof Screenshots.$inferSelect

//
//
//
//

// Encrypted: text, subject, contact, chatName
export const iMessages = pgTable(
  "imessages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const iMessageAttachments = pgTable("imessage_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  //
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
})

export type NewIMessageAttachment = typeof iMessageAttachments.$inferInsert
export type IMessageAttachment = typeof iMessageAttachments.$inferSelect

//
//
//
//

// Encrypted: firstName, lastName, organization, emails, phoneNumbers
export const AppleContacts = pgTable(
  "apple_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    //
    contactId: text("contact_id").notNull(), // The unique ID from the contacts database
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
    // HMAC blind indexes for phone search (one per phone number)
    phoneNumbersIndex: text("phone_numbers_index").array(),
    deviceId: text("device_id").notNull(),
    syncTime: timestamp("sync_time").notNull(),
  },
  (table) => [
    unique("contacts_user_contact_unique").on(table.userId, table.contactId),
    index("contacts_user_id_idx").on(table.userId),
    index("contacts_first_name_index_idx").on(table.firstNameIndex),
    index("contacts_last_name_index_idx").on(table.lastNameIndex),
    index("contacts_phone_numbers_index_idx").using(
      "gin",
      table.phoneNumbersIndex
    ),
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

// Encrypted: text
export const MacosStickies = pgTable("macos_stickies", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // encrypted
  stickyId: text("sticky_id").notNull().unique(),
  text: text("text").notNull(),
  deviceId: text("device_id").notNull(),
  syncTime: timestamp("sync_time").notNull(),
})

export type NewMacosSticky = typeof MacosStickies.$inferInsert
export type MacosSticky = typeof MacosStickies.$inferSelect
