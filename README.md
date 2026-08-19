# tlboard

Self-hosted, real-time collaborative whiteboard. tldraw SDK + tldraw sync, Google/GitHub OAuth,
approval-gated access, multi-board dashboard, per-board RBAC, Meilisearch-powered search.

## Stack

- **Web**: React + Vite + `tldraw` + `@tldraw/sync`
- **Server**: Express — serves the API, the Auth.js OAuth flow, and the tldraw sync WebSocket
  in one process (see `apps/server/src/sync.ts`)
- **DB**: Postgres via Drizzle ORM
- **Search**: Meilisearch
- **Auth**: Auth.js (`@auth/express`), JWT session cookies (httpOnly, secure in production)

One combined "app" container + Postgres + Meilisearch — see `docker-compose.yml`.

## Local dev

```
npm install
cp .env.example .env   # fill in OAuth creds, AUTH_SECRET, etc.
docker compose up -d postgres meilisearch
npm run db:generate -w apps/server
npm run db:migrate
npm run dev:server      # :3000
npm run dev:web         # :5173, proxies /api to :3000
```

Visit http://localhost:5173.

## Registering OAuth apps

### Google (Google Cloud Console → APIs & Services → Credentials)

1. Create an OAuth 2.0 Client ID, type "Web application".
2. Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
   (local dev: `http://localhost:3000/api/auth/callback/google`)
3. Scopes needed: `openid`, `email`, `profile` (Auth.js requests these by default).
4. Copy Client ID/Secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

### GitHub (Settings → Developer settings → OAuth Apps)

1. New OAuth App.
2. Authorization callback URL: `https://<your-domain>/api/auth/callback/github`
   (local dev: `http://localhost:3000/api/auth/callback/github`)
3. Copy Client ID/Secret into `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.

## Bootstrapping the first super admin

Set `SUPER_ADMIN_EMAIL` in `.env` before first run. The first time that email logs in via
either provider it's auto-approved and given the `super_admin` role — no manual SQL. Everyone
else's access depends on the signup mode (Admin → Settings), default `approval_required`.

## Deploying behind Nginx + Cloudflare

- Point Nginx at the `app` container's port 3000; proxy both HTTP and the `/api/sync/*`
  WebSocket upgrade (`proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection
  "upgrade";`).
- Forward `X-Forwarded-For` / `X-Forwarded-Proto` — the server calls `app.set("trust proxy", 1)`
  so secure cookies and `req.protocol` work correctly behind one hop.
- Set `AUTH_URL` to the public HTTPS origin so OAuth callback URLs are generated correctly.
- Cloudflare: proxy mode is fine; WebSockets are supported by default on paid and free plans.

## Data model / security notes

- Every board access check (HTTP routes *and* the WS upgrade) re-reads the user's `status`/role
  from Postgres on each request — nothing is trusted from a cached JWT claim, so a ban or
  approval takes effect on the next request, not the next login.
- Meilisearch results are filtered server-side by `ownerId` / `visibility` / `memberIds` — the
  client never receives a board it can't access.
- OAuth CSRF (`state`) and PKCE are handled by Auth.js itself.

## Known ceiling (v1)

- `viewer` role is enforced both at the HTTP API and at the WS layer — `TLSocketRoom.
  handleSocketConnect` is called with `isReadonly: true` for viewers, so the sync server itself
  rejects edit ops from a viewer session, not just the frontend UI.
- No email notifications, no nested folders — out of scope for v1 per the spec.
