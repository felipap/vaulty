# context

A Next.js app that exposes your personal data for AI agents to use, and an Electron app that pulls that data from your machine.

Meant for self-hosting.

# Deploy

To deploy the web app, you can either:

### One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/felipap/contexter&root-directory=web&env=DATABASE_URL,DASHBOARD_SECRET,API_WRITE_SECRET&envDescription=Required%20environment%20variables%20for%20Context&envLink=https://github.com/felipap/contexter/blob/main/web/README.md%23setup)

Required environment variables:

- `DATABASE_URL` — PostgreSQL connection string (you can use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) or [Neon](https://neon.tech))
- `DASHBOARD_SECRET` — Passphrase to access the web dashboard
- `API_WRITE_SECRET` — Secret for authenticating the Electron app

For rate limiting and other security considerations, see [SECURITY.md](./SECURITY.md).

# License

MIT
