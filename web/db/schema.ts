import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const Devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  name: text("name"),
  approved: boolean("approved").default(false).notNull(),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type InsertDevice = typeof Devices.$inferInsert
export type SelectDevice = typeof Devices.$inferSelect

//
//

export const Screenshots = pgTable("screenshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: uuid("device_id")
    .notNull()
    .references(() => Devices.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type InsertScreenshot = typeof Screenshots.$inferInsert
export type SelectScreenshot = typeof Screenshots.$inferSelect
