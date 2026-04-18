# Deploying behind Caddy

This guide walks through running the XSLT Tool behind [Caddy](https://caddyserver.com/) as a TLS-terminating reverse proxy. Caddy handles HTTPS (either via its internal CA for local/internal use, or Let's Encrypt for public deployments) and forwards traffic to Fastify on `localhost:3000`.

## Architecture

```
Browser ──https──▶ Caddy :443 ──http──▶ Fastify :3000
                                         ├─ /api/*  (API routes)
                                         └─ /*      (static frontend from packages/backend/public/)
```

Because Caddy and Fastify run on the same host and the frontend + API share one public origin, the browser never makes a cross-origin request — **CORS is not needed for normal use**. The existing CORS config (`origin: true, credentials: true`) stays around for the dev-time Vite proxy and future clients running on other origins.

## Prerequisites

- Node.js 22+
- PostgreSQL
- Caddy 2.x (`brew install caddy` on macOS, `sudo apt install caddy` on Debian/Ubuntu)

## 1. Build a release bundle

From the repo root:

```bash
npm run release
```

This runs the full `npm run build` and then assembles a self-contained `release/` folder:

```
release/
├── dist/              compiled backend + Prisma client
├── public/            frontend static bundle
├── prisma/            schema + migrations
├── prisma.config.ts
├── package.json
├── package-lock.json
├── Caddyfile
└── DEPLOY.md          copy of this file
```

Copy the whole folder to the server (e.g. `rsync -a release/ user@host:/srv/xslt-tool/`). The remaining steps are executed on the server.

## 1a. Install runtime dependencies on the server

```bash
cd /srv/xslt-tool
npm ci
npx prisma migrate deploy
```

`npm ci` installs both prod and dev deps — Prisma CLI (a devDependency) is needed for `migrate deploy`. If you'd rather keep devDeps off the server, move `prisma` to `dependencies` in [packages/backend/package.json](../packages/backend/package.json) before building.

## 2. Configure backend env

For a TLS deployment behind Caddy set the following in `packages/backend/.env`:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
SECURE_COOKIES=true
```

- `HOST=127.0.0.1` restricts Fastify to the loopback interface so it's only reachable via Caddy, never directly from the network. This is the default; set `HOST=0.0.0.0` only for dev/testing without a proxy.
- `trustProxy: true` is already enabled in code, so Fastify honours the `X-Forwarded-Proto: https` header Caddy sets — secure cookies will be issued correctly even though the proxied connection between Caddy and Fastify is plain HTTP.

## 3. Start the backend

```bash
node dist/index.js
```

The backend listens on `http://127.0.0.1:3000` (loopback only).

## 4. Start Caddy

A ready-to-use config lives in [Caddyfile](./Caddyfile).

### Local / internal (self-signed cert)

The default site block `xslt.localhost` uses `tls internal`, which tells Caddy to issue a cert from its own local CA. Install the root CA once so your browser trusts it:

```bash
caddy trust
```

Then run Caddy from this directory:

```bash
caddy run --config ./Caddyfile
```

Any `*.localhost` hostname resolves to `127.0.0.1` automatically on modern OSes — no `/etc/hosts` entry needed. Visit: <https://xslt.localhost>

> **Using a different hostname?** If you'd rather use something like `xslt.local`, add it to the Caddyfile and to `/etc/hosts`:
>
> ```
> 127.0.0.1  xslt.local
> ```

### Public deployment (Let's Encrypt)

Uncomment the `xslt.example.com` block in the Caddyfile, replace with your real domain, and ensure:

- DNS A/AAAA record points to the server
- Ports 80 and 443 are open
- You have a valid email address configured (`caddy` will prompt on first run)

Then reload Caddy:

```bash
sudo systemctl reload caddy   # Linux (installed as systemd service)
# or
caddy reload --config ./Caddyfile
```

Caddy obtains and auto-renews the cert — no further action needed.

## 5. Run Caddy as a service (Linux)

The Debian/Ubuntu Caddy package installs a systemd unit. Copy the Caddyfile into place and start it:

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy   # after edits
```

On macOS, `brew services start caddy` runs `/opt/homebrew/etc/Caddyfile`; symlink or copy the repo's Caddyfile there.

## Notes on CORS

The backend registers `@fastify/cors` **only when `NODE_ENV !== "production"`**. Make sure Caddy-fronted deployments set `NODE_ENV=production` in the backend env (or systemd unit) so the plugin is skipped entirely.

Why:

- **Production (behind Caddy)** — frontend and API share one origin, so no CORS headers are needed. Disabling the plugin removes an unnecessary request hook and prevents accidental permissive headers leaking to clients.
- **Dev** — the Vite proxy at `:5173` already keeps browser requests same-origin, but CORS stays enabled so ad-hoc tools (Swagger UI, curl from a separate browser tab, mobile simulators) can hit the backend directly without needing the proxy.

If you ever need a cross-origin production client (mobile app, separate frontend domain), re-enable CORS with a tight `origin` allow-list rather than `origin: true`.

## Troubleshooting

- **Browser says cert is untrusted** — you didn't run `caddy trust`, or you're hitting a hostname that isn't listed in the Caddyfile site block.
- **Cookies not set after login** — check that `SECURE_COOKIES=true` in the backend env and that Caddy is forwarding with `X-Forwarded-Proto: https` (it does by default).
- **502 Bad Gateway** — Fastify isn't running, or it's not on `:3000`. Check `node packages/backend/dist/index.js` output.
- **WebSocket / streaming issues** — `reverse_proxy` handles both; no extra flags needed for this app.
