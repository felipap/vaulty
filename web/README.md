# Vaulty Web

The server component of Vaulty. This is a self-hosted API that:

1. **Receives data from the Desktop** — Screenshots, and eventually other personal data from your machine
2. **Exposes MCP servers** — So AI agents can access your data with your permission

## Deploy

### One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/felipap/vaulty&root-directory=web&env=DATABASE_URL,DASHBOARD_SECRET,API_WRITE_SECRET,API_READ_SECRET&envDescription=Required%20environment%20variables%20for%20Vaulty&envLink=https://github.com/felipap/vaulty/blob/main/web/README.md%23setup)

## Environment Variables

### Required

- `DATABASE_URL` — PostgreSQL connection string (you can use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) or [Neon](https://neon.tech))
- `DASHBOARD_SECRET` — Passphrase to access the web dashboard
- `API_WRITE_SECRET` — Secret for authenticating the Electron app when writing data
- `API_READ_SECRET` — Secret for authenticating API read requests
- `CRON_SECRET` — Secret for Vercel cron jobs (screenshot cleanup)

### Optional

- `DASHBOARD_IP_WHITELIST` — Comma-separated IPs allowed to access the dashboard
- `API_WRITE_IP_WHITELIST` — Comma-separated IPs allowed to write data
- `API_READ_IP_WHITELIST` — Comma-separated IPs allowed to read data

### IP Whitelisting

All whitelists are optional. If not set, all IPs are allowed.

The IP detection works with common proxy setups (checks `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP` headers).

For rate limiting and other security considerations, see [SECURITY.md](../SECURITY.md).
