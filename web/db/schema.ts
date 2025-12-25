import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const Screenshots = pgTable("screenshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  data: text("data").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type InsertScreenshot = typeof Screenshots.$inferInsert
export type SelectScreenshot = typeof Screenshots.$inferSelect
