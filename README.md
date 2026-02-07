<img src="desktop/assets/icons/original.png" alt="vaulty" width="120" />

# vaulty

A self-hosted system that makes your personal data available to AI agents. It consists of a macOS desktop app that collects data from your machine, and a Next.js web app that stores it and exposes it via API.

Your data is end-to-end encrypted. The server never sees plaintext — encryption and decryption happen on your devices. See [SECURITY.md](./SECURITY.md) for details.

## Download

Download the latest macOS desktop app from [GitHub Releases](https://github.com/felipap/vaulty/releases).

## What it collects

The desktop app runs in your menu bar and syncs the following to your server:

- **iMessages** — your full message history and attachments
- **WhatsApp messages** — via local SQLite database or Unipile
- **Contacts** — from macOS AddressBook
- **Screenshots** — periodic screen captures (auto-deleted after 24h)
- **Locations** — GPS coordinates

## Web dashboard

The web app gives you a dashboard to browse all your synced data, and an API that AI agents can query with access tokens.

## Deploy

See [web/README.md](./web/README.md) for deployment instructions (includes one-click Vercel deploy).

## Roadmap

See [ROADMAP.md](./ROADMAP.md).

## License

MIT
