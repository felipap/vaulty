import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export * from "./data"

export const DEFAULT_USER_ID = "default"

//
//
//
//

export const AccessTokens = sqliteTable("access_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  tokenPrefix: text("token_prefix").notNull(),
  scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull().default([]),
  dataWindowMs: integer("data_window_ms"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})

export type NewAccessToken = typeof AccessTokens.$inferInsert
export type AccessToken = typeof AccessTokens.$inferSelect

//
//
//
//

export const WriteLogs = sqliteTable(
  "write_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    type: text("type").notNull(),
    description: text("description").notNull(),
    count: integer("count").notNull().default(1),
    metadata: text("metadata"),
    accessTokenId: text("access_token_id").references(() => AccessTokens.id, {
      onDelete: "set null",
    }),
    tokenPrefix: text("token_prefix"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("write_logs_created_at_idx").on(table.createdAt)]
)

export type NewWriteLog = typeof WriteLogs.$inferInsert
export type WriteLog = typeof WriteLogs.$inferSelect

//
//
//
//

export const ReadLogs = sqliteTable(
  "read_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    type: text("type").notNull(),
    description: text("description").notNull(),
    count: integer("count"),
    metadata: text("metadata"),
    accessTokenId: text("access_token_id").references(() => AccessTokens.id, {
      onDelete: "set null",
    }),
    tokenPrefix: text("token_prefix"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("read_logs_created_at_idx").on(table.createdAt)]
)

export type NewReadLog = typeof ReadLogs.$inferInsert
export type ReadLog = typeof ReadLogs.$inferSelect

//
//
//
//

export const LoginAttempts = sqliteTable(
  "login_attempts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    ip: text("ip").notNull(),
    attemptedAt: integer("attempted_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("login_attempts_ip_idx").on(table.ip),
    index("login_attempts_attempted_at_idx").on(table.attemptedAt),
  ]
)
