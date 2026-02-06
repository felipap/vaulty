/**
 * Normalization for encrypted search. Backend (desktop) and frontend must use
 * the same rules when building and querying blind indexes (HMAC).
 *
 * Keep in sync with: desktop/backend/lib/search-index-utils.ts
 */

/** Strip diacritics (é → e, ñ → n, etc.) so we keep the base character */
function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/\p{M}/gu, "")
}

/** Canonical phone form for index: + and digits only, e.g. +1234567890 */
export function normalizePhoneForSearch(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 0) {
    return ""
  }
  return `+${digits}`
}

/** Canonical chat/name form: strip accents, lowercase, no punctuation or spaces */
export function normalizeChatNameForSearch(name: string): string {
  return stripAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}
