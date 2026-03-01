export const VALID_SCOPES = [
  "contacts",
  "imessages",
  "whatsapp",
  "screenshots",
  "locations",
  "macos-stickies",
  "win-sticky-notes",
  "apple-notes",
  "apple-reminders",
  "imessage:send",
] as const
export type Scope = (typeof VALID_SCOPES)[number]
