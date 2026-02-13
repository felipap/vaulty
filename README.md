<img src="desktop/assets/icons/original.png" alt="vaulty" width="100" />

# Vaulty

Sync your personal data to your own server. Let your AI agents read it.

<!-- screenshot of dashboard here -->

---

Your messages, contacts, and location are scattered across apps that don't talk to each other — and certainly don't talk to your AI tools. Meanwhile, the agents you use every day are flying blind about your actual life.

Vaulty fixes this. It syncs data from your devices to a server you control, encrypts everything end-to-end, and exposes it through a simple API. Your agents get the personal context they need. Nobody else gets anything.

> [!NOTE]
> Vaulty is early software. It works, it's encrypted, and it's being used daily — but expect rough edges.

## What it syncs

| Source             | Description                               | Status |
| ------------------ | ----------------------------------------- | ------ |
| **Apple Messages** | Message history and attachments           | Stable |
| **WhatsApp**       | Message history via local SQLite database | Stable |
| **Apple Contacts** | From macOS AddressBook                    | Stable |
| **Screenshots**    | Periodic screen captures                  | Beta   |
| **Locations**      | GPS coordinates via iOS app               | Beta   |
| **macOS Stickies** | Sticky notes from your desktop            | Stable |

## Roadmap

See [ROADMAP.md](./ROADMAP.md).

## How it works

Vaulty has three pieces:

- **Desktop app** (macOS) — Reads your local data, encrypts it on your machine, and syncs it to your server on a schedule. Runs quietly in the menu bar.
- **Server** (Next.js, deployable via Docker or Vercel) — Stores the encrypted data and exposes it through a REST API. Includes a dashboard for managing access tokens and browsing your data.
- **iOS app** — Shares your realtime location.

Data flows one way: from your devices, through encryption, to your server. The server never sees plaintext — it stores ciphertext and serves it to authorized clients.

## Encryption

All sensitive fields are encrypted on-device using AES-256-GCM before they leave
your machine. The server stores only ciphertext.

For search over encrypted data (e.g. finding WhatsApp messages by sender),
Vaulty uses HMAC-based blind indexes, so the server can match queries without
seeing the underlying.

See [SECURITY.md](./SECURITY.md) for the full breakdown.

## API

Once your data is synced, agents can access it through bearer-token-authenticated endpoints:

```
GET /api/icontacts
GET /api/imessages?limit=20&after=2025-01-01T00:00:00Z
GET /api/imessages/chats
GET /api/imessages/with/{phone}
GET /api/whatsapp/chats
GET /api/whatsapp/chats/{chat_id}/messages
GET /api/screenshots/latest?within_min=60
GET /api/locations/latest?within_min=60
GET /api/llms.txt
```

Access tokens are scoped — you can grant an agent access to contacts but not screenshots, for example. Tokens are managed through the dashboard and prefixed with `vault_`.

Since responses contain encrypted fields, you can run the included [decrypt proxy](./server/scripts/decrypt-proxy.ts) locally to transparently decrypt API responses before they reach your agent.

## Getting started

### 1. Deploy the server

The server is a Next.js app that can be deployed with Docker (recommended for self-hosting) or Vercel. See [server/README.md](./server/README.md) for setup instructions and environment variables.

### 2. Install the desktop app

Download the latest macOS release from [GitHub Releases](https://github.com/felipap/vaulty/releases). On first launch, you'll configure your server URL and encryption passphrase.

### 3. Connect an agent

Create an access token in the dashboard, then point your agent at your server with the token as a bearer credential. The `/api/llms.txt` endpoint describes all available endpoints in a format designed for LLM tool use.
