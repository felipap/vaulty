# Vaulty Server

The server component of Vaulty.

## Deploy

### Docker (recommended for self-hosting)

1. Copy `.env` and fill in your secrets:

```sh
cp .env.example .env
```

2. Start the stack:

```sh
docker compose up -d
```

This starts three containers:

- **app** — The Next.js server (exposed on port 3030 by default)
- **db** — PostgreSQL 16
- **cron** — A lightweight Alpine container that calls the cleanup endpoint every minute

The database schema is applied automatically on startup via `drizzle-kit push`.

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/felipap/vaulty&root-directory=server&env=DATABASE_URL,DASHBOARD_SECRET,API_WRITE_SECRET,CRON_SECRET&envDescription=Required%20environment%20variables%20for%20Vaulty&envLink=https://github.com/felipap/vaulty/blob/main/server/README.md%23environment-variables)

When deploying to Vercel, you'll need to provision your own PostgreSQL database (e.g. [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) or [Neon](https://neon.tech)).

## Environment Variables

### Required

- `DATABASE_URL` — PostgreSQL connection string
- `DASHBOARD_SECRET` — Passphrase to access the web dashboard
- `API_WRITE_SECRET` — Secret for authenticating the Electron app when writing data
- `CRON_SECRET` — Secret used to authenticate the cleanup cron job

### Optional

- `DASHBOARD_IP_WHITELIST` — Comma-separated IPs allowed to access the dashboard
- `API_WRITE_IP_WHITELIST` — Comma-separated IPs allowed to write data
- `API_READ_IP_WHITELIST` — Comma-separated IPs allowed to read data
- `SCREENSHOT_RETENTION_HOURS` — Hours to keep screenshots before cleanup (default: 1)
- `IMESSAGE_RETENTION_HOURS` — Hours to keep iMessages (0 = no expiration)
- `WHATSAPP_RETENTION_HOURS` — Hours to keep WhatsApp messages (0 = no expiration)
- `CONTACT_RETENTION_HOURS` — Hours to keep contacts (0 = no expiration)
- `LOCATION_RETENTION_HOURS` — Hours to keep locations (0 = no expiration)
- `STICKIES_RETENTION_HOURS` — Hours to keep stickies (0 = no expiration)
- `LOG_RETENTION_HOURS` — Hours to keep logs (0 = no expiration)

### Access Tokens

API read access is authenticated via access tokens. Create and manage them in the dashboard settings page. Tokens are prefixed with `ctx_` and validated against the database.

### IP Whitelisting

All whitelists are optional. If not set, all IPs are allowed.

The IP detection works with common proxy setups (checks `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP` headers).

For rate limiting and other security considerations, see [SECURITY.md](../SECURITY.md).
