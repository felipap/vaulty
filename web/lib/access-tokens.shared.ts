export const VALID_SCOPES = [
  "contacts",
  "imessages",
  "whatsapp",
  "screenshots",
  "locations",
] as const
export type Scope = (typeof VALID_SCOPES)[number]
