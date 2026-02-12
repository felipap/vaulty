import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export * from "./syncs"

export const DEFAULT_USER_ID = "default"

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
  dataWindowMs: bigint("data_window_ms", { mode: "number" }), // null = unlimited, ms lookback window
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
