# Build Prompt: Self-Hosted Collaborative Whiteboard (tldraw sync + OIDC + Approval-Gated Access)

Paste this into Claude Code / your coding agent to scaffold the project.

---

## Project Goal

Build a self-hosted, real-time collaborative whiteboard app using the **tldraw SDK + tldraw sync**, with:

- OAuth/OIDC login via **Google** and **GitHub**
- **No self-service access** — new users land in a "pending approval" state after first login and cannot view or edit any room until a **super admin** approves them
- An **admin panel** for approving/rejecting/banning users and assigning roles
- A **super-admin-only toggle**: "Open Signup" (anyone who logs in via OAuth is auto-approved) vs "Approval Required" (default — every new login sits in pending queue)
- **Multiple whiteboards, Google-Docs-style** — not one shared canvas. Users land on a dashboard/home screen listing boards they can access, can create new boards, rename, delete, and share them. This is a core requirement, not a stretch goal.
- Room-level RBAC (view-only / editor / board-admin) tied to each individual board — a natural extension of multi-board support, not a separate feature

---

## Tech Stack

- **Frontend:** React + Vite, `tldraw` SDK, `@tldraw/sync` client (`useSync` hook)
- **Sync server:** Node.js (from tldraw's official sync server template), extended with an auth-check middleware before WebSocket upgrade
- **Auth:** OIDC/OAuth via `Auth.js` (formerly NextAuth) or `Lucia` — pick whichever has cleaner Google + GitHub provider support for a non-Next.js Vite/Express setup. If using Next.js instead of Vite, Auth.js is the obvious choice.
- **Database:** **PostgreSQL** (via Prisma or Drizzle ORM) for users, approval status, roles, board/membership data — self-hosted in its own Docker container, single instance can be shared across other Sabilylab internal tools if useful; chosen over SQLite for safe concurrent writes, proper backups (`pg_dump`/WAL), and headroom as usage grows
- **Reverse proxy:** Assume Nginx + Cloudflare in front (already in place) — app should read `X-Forwarded-*` headers correctly and support being served under a subpath if needed
- **Search:** **Meilisearch** (self-hosted, Algolia-style instant/typo-tolerant search) — indexes board metadata (name, owner, last modified) for the dashboard search bar; open-source, single Docker container, no external SaaS dependency
- **Deployment:** Docker Compose — one container for the web/API server, one for the sync server (or combine if simplicity is preferred), volume-mounted SQLite file

---

## Data Model (minimum)

```
User
- id
- email
- name
- avatar_url
- provider (google | github)
- provider_id
- status: pending | approved | rejected | banned
- role: super_admin | admin | member
- created_at
- approved_by (user_id, nullable)
- approved_at (nullable)

AppSettings
- signup_mode: "open" | "approval_required"  (default: approval_required)
- (extendable later for other global toggles)

Board
- id
- name
- owner_id (user who created it)
- visibility: private | org (org = visible to all approved users; private = invite-only)
- created_at
- updated_at (bump on any edit, for "last modified" sorting like Docs)
- archived_at (nullable — soft delete)

BoardMembership
- board_id, user_id, role: viewer | editor | board_admin
- invited_by, invited_at
```

---

## Core Flows

### 1. First login (any provider)
1. User clicks "Sign in with Google" or "Sign in with GitHub"
2. OAuth/OIDC flow completes, user record created if new
3. Check `AppSettings.signup_mode`:
   - `open` → user is auto-set to `status: approved`, `role: member`
   - `approval_required` (default) → user is set to `status: pending`
4. If `pending`, redirect to a **"Awaiting Approval"** screen — no access to any board, no room list, nothing rendered but a friendly waiting message + their submitted info
5. If `approved`, redirect to the whiteboard app

### 2. Every subsequent request (frontend + sync server)
- Frontend: route guard checks session status on every protected route; `pending`/`rejected`/`banned` users always bounce to the waiting/rejected screen, never see canvas UI
- Sync server: **this is critical** — don't rely on frontend gating alone. The WebSocket upgrade handler must independently verify the user's session token, check `status === 'approved'`, AND check the user has a `BoardMembership` (or the board is `org`-visibility) for the specific `board_id` in the connection request, before allowing the connection. A rejected/pending user, or an approved user with no access to that specific board, must both be refused at the server — not just hidden in the UI.

### 3. Board dashboard (home screen after login)
- Approved users land on `/dashboard`, not directly on a canvas
- Shows a grid/list of boards the user owns or is a member of, sortable by "last modified" — mirrors a Docs-style home screen
- **Instant search bar** at the top of the dashboard, Algolia/Meilisearch-style: as-you-type results, typo-tolerant, filters to boards the user can actually see (owned + member-of + org-visible), highlights matched text in results, sub-100ms feel. Search index updates on board create/rename/delete (and membership changes, so access stays in sync with what's searchable).
- **"New Board"** button — creates a board, sets creator as `board_admin`, opens the canvas at `/board/:id`
- Each board card: rename, delete (owner/board_admin only), duplicate, share
- **Share dialog** per board: invite by email (must already be an approved user) or generate a shareable link with a role attached (viewer/editor); org-visibility boards skip invites entirely and are just listed for every approved user
- Board URL (`/board/:id`) is what actually connects to the sync server room — each board = one sync room, keyed by board id

### 4. Super admin panel (`/admin`)
- Only visible/accessible to `role: super_admin` (and `admin` for a reduced view, if you want two tiers)
- **Pending Users** tab: list of pending users with Approve / Reject buttons, shows email, name, provider, signup timestamp
- **All Users** tab: search/filter by status/role, ability to change role, ban/unban, revoke approval
- **Settings** tab: the global toggle —
  ```
  Signup Mode: ( ) Open — new logins auto-approved
               (•) Approval Required — new logins wait for admin review
  ```
  This must be a single source of truth read by the login flow (step 1 above) on every new signup.
- First super admin: seed via environment variable (e.g. `SUPER_ADMIN_EMAIL=you@domain.com`) — on that email's first login, auto-assign `super_admin` + `approved`, bypassing the pending gate entirely. Don't make the deployer manually SQL-edit the DB to bootstrap their own access.

### 5. Rejected / banned users
- Rejected: can see a "your access was not approved" screen, can't retry without admin reversing it
- Banned: hard block, no session issued at all if possible (invalidate on login attempt)

---

## Security Requirements

- Session tokens must be httpOnly, secure cookies — no tokens in localStorage
- WebSocket auth check must happen server-side on connection, not trusted from client-supplied claims
- Rate-limit login attempts and admin approval actions
- Validate OAuth `state` param to prevent CSRF on the OAuth callback
- Admin panel routes protected server-side, not just hidden in the frontend nav
- CORS locked to your actual domain, not wildcard
- Search results must be scoped server-side to boards the requesting user can access — never let Meilisearch return board names/metadata for boards the user has no membership on and that aren't `org`-visible. Use a per-request filtered search (Meilisearch supports filter expressions) rather than filtering client-side after the fact.

---

## Deliverables

1. `docker-compose.yml` — web app + sync server + Postgres container + Meilisearch container + volumes for Postgres data and Meilisearch data
2. `.env.example` — Google client ID/secret, GitHub client ID/secret, session secret, `SUPER_ADMIN_EMAIL`, Postgres connection string (`DATABASE_URL`), Meilisearch host/API key, `AppSettings` defaults
3. Working OAuth login for Google + GitHub
4. Pending/approved/rejected state machine enforced on both frontend routes and sync server WS handshake
5. Admin panel with pending queue, user management, and the signup-mode toggle
6. README covering: how to register OAuth apps on Google Cloud Console + GitHub Developer Settings (redirect URIs, scopes needed), how to set the first super admin, how to deploy behind Nginx/Cloudflare

---

## Explicitly Out of Scope (unless asked later)

- Payment/billing
- Email notifications on approval (nice-to-have, not required for v1)
- Nested folders/organization for boards (flat list with search is fine for v1)
- Mobile app — web-responsive only

---

## Notes for the Agent

- Use tldraw's official generic Node/Bun sync server template as the starting point for the sync server, don't build the CRDT/room-sync logic from scratch.
- Keep the auth layer decoupled from tldraw-specific code as much as possible — it should be a normal Express/Node auth+admin app that happens to gate access to a tldraw canvas, not something hacked into tldraw's internals.
- Favor Drizzle or Prisma with Postgres — matches a self-hosted deployment with room to grow, avoids SQLite's write-concurrency ceiling as board/user activity scales.
- Commit your progress with git.