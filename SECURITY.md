# Table of Contents

- [Table of Contents](#table-of-contents)
  - [Server Dashboard](#server-dashboard)
  - [Client Authentication](#client-authentication)
  - [API Access Tokens](#api-access-tokens)
  - [E2E Encryption](#e2e-encryption)
  - [Dashboard Decryption](#dashboard-decryption)
  - [Encrypted Fields by Table](#encrypted-fields-by-table)
  - [Encryption Key Management](#encryption-key-management)
  - [Blind Indexing for Search](#blind-indexing-for-search)
- [Rate Limiting](#rate-limiting)

## Server Dashboard

The dashboard uses a passphrase-based system. The passphrase is set via
`DASHBOARD_SECRET` env var on the server. It's stored in an httpOnly cookie that
expires in a year.

## Client Authentication

The Electron app authenticates via a shared secret `API_WRITE_SECRET`, sent as
Bearer token.

## API Access Tokens

The user can use the dashboard to create access tokens for reading data from the
API via the dashboard.

## E2E Encryption

Data is encrypted on the client before it's sent to the server. The server API
returns encrypted data too.

## Dashboard Decryption

Users can see decrypted data in the dashboard by entering the encryption key, or
clicking the "Open Dashboard" button in the Electron app. Decryption happens
entirely in the user browser and the encryption key must never be sent to the
server. The encryption key is stored in `sessionStorage` and expires after 1 hour.

## Encrypted Fields by Table

Each server-side table has a mix of encrypted fields (stored as `enc:v1:...`
ciphertext) and plaintext fields which the server can read.

The encryption makes it impossible to search for plaintext values, which would
be a dealbreaker for certain workflows (eg. searching for messages from a
particular phone number). To solve this, we also store HMAC-based blind indexes
on certain encrypted fields, as noted below.

**screenshots**

|           | Fields                                |
| --------- | ------------------------------------- |
| Encrypted | image data                            |
| Plaintext | dimensions (width, height), file size |

**imessages**

|           | Fields                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| Encrypted | text, subject                                                                                              |
| Plaintext | contact identifier, date, isFromMe, isRead, isSent, isDelivered, hasAttachments, service, chatId, chatName |

**imessage_attachments**

|           | Fields                        |
| --------- | ----------------------------- |
| Encrypted | file data                     |
| Plaintext | filename, mimeType, file size |

**contacts**

|           | Fields                                                  |
| --------- | ------------------------------------------------------- |
| Encrypted | firstName, lastName, organization, emails, phoneNumbers |
| Plaintext | contactId (source system ID)                            |

**locations**

|           | Fields              |
| --------- | ------------------- |
| Encrypted | latitude, longitude |
| Plaintext | timestamp, accuracy |

**whatsapp_messages**

|                | Fields                                                         |
| -------------- | -------------------------------------------------------------- |
| Encrypted      | text, chatName, senderName, senderPhoneNumber                  |
| Plaintext      | chatId, messageId, senderJid, timestamp, isFromMe, isGroupChat |
| Search Indices | chatNameIndex, senderNameIndex, senderPhoneNumberIndex         |

The remaining tables (`write_logs`, `read_logs`, `access_tokens`,
`login_attempts`) are operational — they don't store user content and have no
encrypted fields.

## Encryption Key Management

**What we do now:**

- Single encryption key per user (passphrase-derived via PBKDF2)
- Encrypted values are prefixed with `enc:v1:` to self-identify as encrypted
- Some fields are encrypted (message text, lat/long), others are plaintext (timestamps, contact IDs) so the server can index/query
- No key identifier stored — we assume all data uses the same key
- The `v1` in `enc:v1:` indicates the encryption _format_ version, not which key was used

**What we could do (but don't):**

- **Key rotation with key IDs**: Format could become `enc:v1:key01:iv:tag:ciphertext` to track which key encrypted what. Would allow rotating keys without re-encrypting old data.
- **Per-table or per-field keys**: Different keys for messages vs locations. More complexity, unclear benefit.
- **Key escrow / recovery**: Store an encrypted backup of the key somewhere. Defeats zero-knowledge if done wrong.

**Trade-offs of zero-knowledge encryption:**

- Forget your key → data is permanently lost (feature, not a bug)
- Change your key → must re-encrypt everything
- Multiple devices → all need the same passphrase
- Server can't help you recover anything

**Open questions Felipe doesn't know the answer to:**

- Is PBKDF2 with 100k iterations still considered good? (Argon2 is "better" but more complex)
- Should we ever implement key rotation, or is "re-encrypt everything" fine for a personal tool?

## Blind Indexing for Search

The encryption uses random IVs, so the same plaintext encrypted twice produces different ciphertexts. This is a security feature (prevents pattern detection) but makes server-side search impossible.

**Solution: HMAC blind indexes**

For fields that need to be searchable, we store a deterministic HMAC alongside the encrypted value:

```
senderPhoneNumber: "enc:v1:..."      // encrypted (different every time)
senderPhoneNumberIndex: "a3f8c2..."  // HMAC (same input → same output)
```

The HMAC is computed using:

- HMAC-SHA256
- Key derived via PBKDF2 with a separate salt (`contexter-search-index-v1`)
- Same passphrase as encryption

**How search works:**

1. Client computes HMAC of search term using their passphrase
2. Client sends the HMAC to the server (not the plaintext)
3. Server matches against the index column

**Limitations:**

- Only exact matches work (no partial/fuzzy search)
- Phone numbers must be normalized consistently on both sides
- Adding a searchable field requires schema change + backfill from desktop app

**Currently indexed fields (WhatsApp):**

- `chatNameIndex`
- `senderNameIndex`
- `senderPhoneNumberIndex`

# Rate Limiting

Configure rate limiting in the Vercel dashboard under **Firewall → + New Rule**.

Recommended rule for API endpoints:

- **Name:** `api-rate-limit`
- **If:** Request Path starts with `/api`
- **Rate Limit:** Fixed Window, 300 seconds, 10 requests, Key: IP Address
- **Then:** Too Many Requests (429)

See [docs/firewall-example.png](./docs/firewall-example.png) for reference.
