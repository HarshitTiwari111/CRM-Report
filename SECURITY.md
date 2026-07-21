# Security Guide — TaskPulse CRM

This document describes the security measures implemented in the codebase and the
operational steps that must be completed in external dashboards (MongoDB Atlas,
Cloudflare, Render, SMTP provider) to fully protect production data.

## 1. What is implemented in code

### Authentication & sessions
- **JWT access tokens** (15 min) + **refresh tokens** (7 days) signed with separate secrets.
- Refresh tokens are stored **hashed (SHA-256)** in MongoDB and are **revocable**.
- Refresh tokens travel only in an **HttpOnly, Secure, SameSite cookie** scoped to
  `/api/auth` — JavaScript can never read them, so XSS cannot steal a session.
- **Token rotation**: every refresh invalidates the old token (single-use). A stolen,
  already-used refresh token is rejected.
- Access tokens live **in memory only** on the client (never in localStorage).
- Password change / reset revokes **all** existing sessions.

### Brute-force protection
- Per-account lockout: **5 wrong passwords → 15-minute lock** (HTTP 423) + audit log
  + email alert to the account owner.
- Rate limiting: strict limiter on `/login`, `/register`, `/forgot-password`,
  `/reset-password` (20 req / 15 min per IP) and a general API limiter (500 req / 15 min).

### Two-factor authentication (TOTP)
- Any user can enable 2FA from **Profile → Two-Factor Authentication** (QR code for
  Google Authenticator / Authy). **Strongly recommended — enable it for every
  superadmin/admin account.**
- Login becomes two-step: password → 6-digit code. The intermediate token is
  purpose-bound (5 min) and is rejected by every API endpoint.
- Disabling 2FA requires the current password **and** a valid code.

### Roles (RBAC)
- Four roles: `superadmin` > `admin` > `manager` > `employee`.
- Admin-level routes require `superadmin`/`admin`; settings are superadmin-only.
- **Privilege-escalation guard**: an actor can only create/modify/delete accounts with
  a role strictly below their own (superadmin manages everyone). An admin can never
  promote anyone to admin/superadmin.
- Public self-registration always creates plain `employee` accounts.

### Passwords
- bcrypt with cost factor 12.
- Policy enforced client- and server-side: minimum 8 chars, upper + lower + digit.

### Input & upload safety
- express-validator on auth/user routes; Zod schemas client-side.
- NoSQL-injection guard: `$`/`.`-prefixed keys stripped from body/query/params.
- XSS guard: HTML special characters escaped in all string inputs.
- Uploads: mime **and** extension allowlists, size limits, **magic-byte signature
  verification** (spoofed types deleted), SVG blocked, `/uploads` served with
  `nosniff` + a deny-all CSP so nothing can execute in the app origin.

### HTTP hardening
- Helmet (with HSTS in production), `x-powered-by` removed, `trust proxy` for
  correct IPs behind Render/Cloudflare.
- Strict CORS: only `CLIENT_URL` is allowed, with credentials.

### Audit logs & alerts
- ActivityLog records (1-year TTL): login, logout, failed logins, lockouts,
  2FA challenges/enable/disable, registration, password change/reset, user
  management actions, task/data actions — with IP address.
- Superadmin/admin can review them at **Admin → Activity Logs**.
- **New-device alerts**: every account remembers its recent devices
  (user-agent + IP fingerprint); a login from an unknown device triggers an audit
  entry and an email alert to the account owner.
- Alert/reset emails require SMTP to be configured (see below); without SMTP they
  are printed to the server log only.

## 2. Required external setup (do these in dashboards)

### MongoDB Atlas
1. **Network Access → IP Access List**: remove `0.0.0.0/0` if present. Allow only
   your server's egress IPs (Render → your service → *Outbound IPs*) and, if
   needed, your office IP.
2. **Database Access**: use a dedicated user for the app with `readWrite` on this
   database only (not `atlasAdmin`). Rotate the password if it was ever committed
   or shared — the URI in `server/.env` counts as shared if the folder was zipped
   or pushed anywhere.
3. **Backups**: on a paid tier (M2+) enable **Cloud Backup** with continuous or
   daily snapshots. The free M0 tier has **no backups** — upgrade for production
   data, or schedule `mongodump` externally.
4. **Encryption**: Atlas encrypts data at rest and in transit (TLS) by default —
   nothing to do unless you need customer-managed keys (Enterprise).
5. **Alerts**: Atlas → Alerts — enable alerts for connection spikes and data
   transfer anomalies.

### Cloudflare (WAF + DDoS)
1. Point your domain's DNS at Cloudflare (orange-cloud proxied records for the
   client and API hostnames).
2. **SSL/TLS mode: Full (strict)**.
3. **Security → WAF**: enable the free Cloudflare Managed Ruleset; add a rate
   limiting rule for `POST /api/auth/*` (e.g. 10 req/min per IP) as an outer
   layer on top of the app's own limiter.
4. **DDoS protection** is automatic on all plans.
5. Optional: **Bot Fight Mode** ON; block countries you never expect logins from.

### HTTPS
- Render and Cloudflare both terminate TLS automatically — the app already sets
  HSTS and Secure cookies when `NODE_ENV=production`. Never expose the API over
  plain HTTP in production.

### SMTP (needed for reset links + security alerts)
Set in `server/.env` (or Render env vars): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `SMTP_FROM`. Any provider works (Brevo, Resend SMTP, SES, Gmail app
password for testing).

### Monitoring
- Render → service → **Health Check Path**: `/api/health`.
- Add an external uptime monitor (UptimeRobot/BetterStack, free) on the same URL.
- Review **Admin → Activity Logs** weekly for `login-failed`, `account-locked`,
  `login-new-device` patterns.

### Secrets hygiene
- `.env` files are git-ignored; keep them that way. Production secrets live only
  in Render env vars (`render.yaml` uses `sync: false` / generated values).
- Rotate `JWT_SECRET`/`JWT_REFRESH_SECRET` if leaked (all users re-login).
- The seeded superadmin (`admin@crm.local` / `Admin@123`) must have its password
  changed immediately, and 2FA enabled, on any real deployment.

## 3. Environment variables (security-relevant)

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing keys — long random values, never reused across environments |
| `JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` | Token lifetimes (15m / 7d) |
| `CLIENT_URL` | The only origin allowed by CORS; also used in reset links |
| `COOKIE_SAMESITE` | `lax` same-origin (default), `none` when client & API are on different domains (needs HTTPS) |
| `NODE_ENV=production` | Turns on HSTS, Secure cookies, trust proxy |
| `SMTP_*` | Outbound email for reset links and security alerts |
