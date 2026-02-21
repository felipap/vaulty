<img src="desktop/assets/icons/original.png" alt="vaulty" width="100" />

# Vaulty

A cloud database for your data (WhatsApp, iMessage, contacts, etc.) that AIs can
read.

Agents need access to your data to be useful to you. Vaulty is an E2E encrypted
database that stores your messages, contacts, coordinates etc, and makes it
available through a simple API for your agents to use.

> [!NOTE]
> Vaulty is in early stages. Please study the repo and read our [security model](./SECURITY.md) before using it for yourself.

## Roadmap

See [ROADMAP.md](./ROADMAP.md).

## Supported sources

| Source             | Description                               | Status |
| ------------------ | ----------------------------------------- | ------ |
| **Apple Messages** | Message history and attachments           | Stable |
| **WhatsApp**       | Message history via local SQLite database | Stable |
| **Apple Contacts** | From macOS AddressBook                    | Stable |
| **Screenshots**    | Periodic screen captures                  | Beta   |
| **Locations**      | GPS coordinates via iOS app               | Beta   |
| **macOS Stickies** | Sticky notes from your desktop            | Stable |

## How it works

Vaulty has three copmponents

- **Desktop app** (macOS) — Reads your local data, encrypts it on your machine, and syncs it to your server on a schedule. Runs quietly in the menu bar.
- **Server** (Next.js, deployable via Docker or Vercel) — Stores the encrypted data and exposes it through a REST API. Includes a dashboard for managing access tokens and browsing your data.
- **iOS app** — Shares your realtime location.

Data flows one way: from your devices, through encryption, to your server. The server never sees plaintext — it stores ciphertext and serves it to authorized clients.

## API

Once your data is synced, agents can access it through bearer-token-authenticated endpoints:

```
GET /api/apple-contacts
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

## Encryption

Most fields are encrypted on-device using AES-256-GCM before they leave
your machine.

See [SECURITY.md](./SECURITY.md) for the full breakdown.

## Getting started

### 1. Deploy the server

The server is a Next.js app that can be deployed with Docker or Vercel. See [server/README.md](./server/README.md) for setup instructions and environment variables.

### 2. Install the desktop app

Download the latest macOS release from [GitHub Releases](https://github.com/felipap/vaulty/releases). On first launch, you'll configure your server URL and encryption passphrase.

### 3. Connect an agent

Create an access token in the dashboard, then point your agent at your server with the token as a bearer credential. The `/api/llms.txt` endpoint describes all available endpoints in a format designed for LLM tool use.
