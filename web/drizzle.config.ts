import { defineConfig } from "drizzle-kit"

const DATABASE_URL = process.env.DATABASE_URL || ""
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
})
