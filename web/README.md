# Context Web

The server component of Context. This is a self-hosted API that:

1. **Receives data from the Electron app** — Screenshots, and eventually other personal data from your machine
2. **Exposes MCP servers** — So AI agents can access your data with your permission

## Architecture

This is **not** a traditional web app. The HTML pages are minimal and only exist for basic admin tasks (like approving devices). The real value is the API.

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Electron App  │────────▶│   Context Web   │◀────────│   AI Agents     │
│  (data source)  │  writes │      (API)      │  reads  │   (via MCP)     │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Auth Model

Since you self-host this and it contains your sensitive personal data, traditional email/password auth doesn't make sense. You already have access to the server.

- **Devices** (Electron app) authenticate via device ID + approval flow
- **Web dashboard** access is protected at the infrastructure level (VPN, Tailscale, etc.)
- **MCP servers** will use token-based auth for AI agents

## Setup

1. Set up PostgreSQL
2. Copy `.env.example` to `.env`:
   - `DATABASE_URL` — PostgreSQL connection string
   - `ADMIN_SECRET` — Passphrase to access the dashboard (optional in dev)
3. Push the schema: `npx drizzle-kit push`
4. Start dev server: `npm run dev`

## API

### Device Endpoints

- `POST /api/devices/register` — Register a new device
- `GET /api/devices` — List all devices
- `POST /api/devices/[id]/approve` — Approve a device

### Data Endpoints

- `POST /api/screenshots` — Upload a screenshot (device auth required)
- `GET /api/dashboard` — Get stats

### MCP Servers (coming soon)

The API will expose MCP servers that AI agents can connect to, giving them access to your personal context data.
