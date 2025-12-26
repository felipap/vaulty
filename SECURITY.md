This is a SHORT document, explaining the security measures in place. It's not
the place for AI slop, or legaleeze.

## Authentication

There are two auth flows: one for the admin dashboard, one for devices (Electron app).

### Admin Dashboard

A passphrase-based system. The passphrase is set via `ADMIN_SECRET` env var on the server.

1. User enters passphrase on login page
2. Server compares it to `ADMIN_SECRET`
3. If valid, sets an httpOnly cookie (`context_admin`) containing the passphrase
4. Cookie settings: httpOnly, secure in production, sameSite=lax, 1 year expiry
5. Subsequent requests check if cookie value matches `ADMIN_SECRET`

In development, if `ADMIN_SECRET` is unset, auth is bypassed entirely.

### Device Auth (Desktop App)

Devices authenticate via a shared secret:

1. Set `DEVICE_SECRET` env var on the server
2. Enter the same secret in the desktop app settings
3. Desktop app sends it as `Authorization: Bearer <secret>` header
4. Server rejects requests where the token doesn't match

If `DEVICE_SECRET` is unset on the server, device auth is bypassed (for development).

## Server security

API read is actually more sensitive than write.
