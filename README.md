# Portfolio PMS — Project Management System

A Kanban-based PMS designed for remote/collaborative teams. Built with **Next.js 15 (App Router, Tailwind)** and **NestJS 11 + Prisma**, backed by **PostgreSQL 16** and **Redis 7**. Authentication via **NextAuth v5 (GitHub OAuth)** with a **JWT session** that exposes an `apiToken` for API calls. Role-based access control (RBAC) supports **OWNER / ADMIN / MEMBER / VIEWER**.

> [PLACEHOLDER – HERO IMAGE]  
> Add a clean product screenshot (Kanban board + header with role badge).

> [PLACEHOLDER – SHORT DEMO VIDEO/GIF]  
> 30–60s demo: sign in → role badge in header → drag & drop → 401/403 banners.

---

## Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Auth & RBAC](#auth--rbac)
  - [GitHub OAuth App Setup](#github-oauth-app-setup)
  - [NextAuth Token Injection Flow](#nextauth-token-injection-flow)
  - [Permission Matrix](#permission-matrix)
  - [Test Scenarios](#test-scenarios)
  - [Seed Helper (CLI)](#seed-helper-cli)
- [Kanban UX](#kanban-ux)
- [API Overview](#api-overview)
- [Docker (local build)](#docker-local-build)
- [Troubleshooting](#troubleshooting)
- [Change History (highlights)](#change-history-highlights)

---

## Features
- ✅ **Full-stack monorepo** (Turborepo + pnpm)
- ✅ **Dockerized** PostgreSQL 16 / Redis 7
- ✅ **Prisma** schema & migrations
- ✅ **Health checks**: `/health`, `/health/db`
- ✅ **Kanban board**
  - Drag & drop issues within/between columns
  - Horizontal drag & drop of columns
  - Create / Rename / Delete columns
  - Create / Rename / Delete issues
  - Deterministic ordering persisted in DB
  - **Multi-board select** (merge view or single-board focus)
  - **Bulk**: clear all columns & issues of the active board
- ✅ **Boards/Columns/Issues CRUD** (NestJS + Prisma)
- ✅ **Frontend integration** (App Router) + health dashboard
- ✅ **UI v2**: Tailwind tokens, polished header/actions, button/input/card primitives
- ✅ **Dev rewrites** for API (`/api/*`, `/boards/*`, `/columns/*`, `/issues/*`)
- ✅ **Auth (GitHub via NextAuth)**
- ✅ **RBAC**: OWNER/ADMIN/MEMBER/VIEWER
  - Viewer read-only gating (buttons disabled, DnD blocked)
  - Role badge in header (color-coded)
  - 401/403 UX polish: sticky re-auth banner, subtle 403 banner
  - Standardized toasts (English)
- ✅ **Fetch wrapper**: injects `Authorization: Bearer <apiToken>` on non-GET; emits 401/403 events
- ✅ **Seed helper (CLI)**: role grant/demote by email; CSV bulk
- ⏳ Audit log & activity feed
- ⏳ CI/CD & deployment


---

## Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind
- **Backend**: NestJS 11, TypeScript, Prisma
- **DB/Cache**: PostgreSQL 16, Redis 7 (Docker)
- **Auth**: NextAuth v5 (GitHub OAuth), JWT session
- **RBAC**: OWNER / ADMIN / MEMBER / VIEWER
- **Tooling**: pnpm, Turborepo

---

## Architecture
```text
apps/
  web/   (Next.js 15, App Router, Tailwind)
  api/   (NestJS 11 + Prisma)
infra/
  docker-compose.yml
pnpm-workspace.yaml
turbo.json
```

- **Dev rewrites** (web):
  - `/api/*`, `/boards/*`, `/columns/*`, `/issues/*` → `${NEXT_PUBLIC_API_BASE}` (default: `http://localhost:3001`)

> [PLACEHOLDER – ARCHITECTURE DIAGRAM]  
> Simple diagram: Web (Next.js) → API (NestJS) → PostgreSQL/Redis. Show OAuth → session (apiToken) → Authorization header flow.

---

## Quick Start
```bash
pnpm i
cp .env.example .env   # or fill both apps/web/.env.local and apps/api/.env as below
pnpm -w dev            # web on :3000, api on :3001
```
- Web: http://localhost:3000  
- API: http://localhost:3001

Health checks:
```bash
curl -s http://localhost:3001/health
curl -s http://localhost:3001/health/db
```

---

## Environment Variables

**apps/web/.env.local**
```text
NEXT_PUBLIC_WORKSPACE_ID=ws_local
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-32+chars
GITHUB_ID=<your_github_oauth_client_id>
GITHUB_SECRET=<your_github_oauth_client_secret>
```

**apps/api/.env**
```text
DATABASE_URL=postgresql://app:app@127.0.0.1:5432/appdb?schema=public
REDIS_URL=redis://localhost:6379
PORT=3001
NEXTAUTH_SECRET=replace-with-32+chars
```
- `NEXTAUTH_SECRET` must match between web & api.
- `NEXT_PUBLIC_API_BASE` is used by the web dev proxy rewrites.

---

## Auth & RBAC

### GitHub OAuth App Setup
1. GitHub → Settings → Developer settings → **OAuth Apps** → **New OAuth App**
2. Homepage URL: `http://localhost:3000`
3. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Save and copy **Client ID** and **Client Secret** to `apps/web/.env.local`.

### NextAuth Token Injection Flow
1. User logs in via GitHub OAuth.
2. NextAuth creates a **JWT session** that includes `apiToken` (signed with `NEXTAUTH_SECRET`).
3. The web fetch wrapper (`apiFetch`) adds `Authorization: Bearer <apiToken>` to **non-GET** requests.
4. The API verifies the token and enforces **RBAC** via `JwtAuthGuard` + `ScopedRolesGuard`.
5. On `401` or `403`, the wrapper emits events:
   - `401`: top sticky banner with **Sign in again**.
   - `403`: subtle banner; no duplicate toasts.

### Permission Matrix
| Resource \ Action     | Read | Create | Update | Delete | Reorder | Bulk Clear | Delete Board (cascade) |
|------------------------|:----:|:------:|:-----:|:------:|:-------:|:----------:|:-----------------------:|
| **OWNER**              |  ✅  |   ✅   |   ✅  |   ✅   |   ✅    |     ✅     |           ✅            |
| **ADMIN**              |  ✅  |   ✅   |   ✅  |   ✅   |   ✅    |     ✅     |           ✅            |
| **MEMBER**             |  ✅  |   ✅   |   ✅  |   ✅   |   ✅    |     ✅     |           ❌            |
| **VIEWER**             |  ✅  |   ❌   |   ❌  |   ❌   |   ❌    |     ❌     |           ❌            |

### Test Scenarios
- **OWNER vs VIEWER**
  - Owner: create board/columns/issues; drag columns and issues; bulk clear; cascade delete board.
  - Viewer: cannot create/rename/delete; DnD blocked; attempting write shows **403 banner**.
- **Session Expiry (401)**
  - Invalidate session; attempt a write → **401** re-auth banner with **Sign in again**.

### Seed Helper (CLI)
Grant/demote roles by email, or bulk via CSV.

**File**: `apps/api/scripts/role.js`  
**Usage**
```bash
node scripts/role.js set <email> <ROLE>     # ROLE ∈ OWNER|ADMIN|MEMBER|VIEWER
node scripts/role.js bulk ./emails.csv      # CSV: "email,ROLE", header optional
```
**Package scripts (apps/api/package.json)**
```json
{
  "scripts": {
    "role": "node scripts/role.js",
    "role:set": "node scripts/role.js set",
    "role:bulk": "node scripts/role.js bulk"
  }
}
```

---

## Kanban UX
- **URL**: `/boards` (or your route)
- **Board picker**: “Boards: N selected” for multi-select  
  - Single-board mode enables **column DnD (left↔right)**  
  - Issue DnD works in single- and multi-board views
- **Role badge**: header-right shows current role (color-coded)
- **Write actions**: `requires-write` elements disabled for Viewer
- **Banners**
  - `401` expired session → sticky top banner with **Sign in again**
  - `403` insufficient role → subtle banner; no duplicate toasts

> [PLACEHOLDER – KANBAN SCREENSHOT]  
> Board picker open + role badge visible + issue DnD hint.

---

## API Overview
- **Boards**
  - `GET /boards?workspaceId=...`
  - `GET /boards/:id`
  - `GET /boards/:id/full`
  - `POST /boards`
  - `PATCH /boards/:id`
  - `DELETE /boards/:id[?cascade=true]`
- **Columns**
  - `GET /columns?boardId=...`
  - `POST /columns`
  - `PATCH /columns/:id`
  - `DELETE /columns/:id`
  - `POST /columns/:id/reorder` `{ "issueIds": string[] }`
  - `POST /columns/reorder` `{ "boardId": string, "columnIds": string[] }`
- **Issues**
  - `GET /issues?workspaceId=...&columnId=...`
  - `POST /issues`
  - `PATCH /issues/:id`
  - `DELETE /issues/:id`
- **Health**
  - `GET /health`, `GET /health/db`

---

## Docker (local build)
Local image builds (deployment out of scope).
```bash
docker build -f apps/web/Dockerfile -t pms-web:local .
docker build -f apps/api/Dockerfile -t pms-api:local .
# web exposes 3000; api exposes 4000 (dev server runs on 3001)
```

---

## Troubleshooting (Extended)

Below are the most common issues organized by area. Each item includes checks and fixes you can copy/paste.

---

### 1) Setup & Environment
- **Wrong env file loaded**
  - Confirm paths:
    - Web: `apps/web/.env.local`
    - API: `apps/api/.env`
  - Restart dev servers after any env change.
- **Generate a strong secret**
  ```bash
  openssl rand -base64 48 | tr -d '\n'
  ```
  Set the value to **both** `NEXTAUTH_SECRET` (web & api).
- **Timezone / clock drift**
  - Large time drift breaks JWT validation. Sync your clock (e.g., macOS: `sudo sntp -sS time.apple.com`).

---

### 2) Auth / OAuth / NextAuth
- **Callback URL mismatch**
  - GitHub OAuth → Authorization callback must be exactly:
    - `http://localhost:3000/api/auth/callback/github`
- **401 on write**
  - Confirm you’re signed in and session has `apiToken`:
    - Browser DevTools → Application → Session storage or call `GET /api/auth/session` in the web app.
  - `NEXTAUTH_SECRET` must be identical in both web and api.
  - Check the request has `Authorization: Bearer <token>`
    - DevTools → Network → your POST/PATCH/DELETE → Headers.
- **Login loops / redirects to /auth/error**
  - Clear site data/cookies and retry.
  - Ensure web rewrites do **not** proxy `"/api/auth/*"` to the backend.
- **Enable verbose logs**
  ```bash
  # web
  NEXTAUTH_DEBUG=true pnpm -C apps/web dev
  # api
  LOG_LEVEL=debug pnpm -C apps/api start:dev
  ```

---

### 3) RBAC / Permissions
- **Viewer cannot write**
  - This is expected. Promote your email:
  ```bash
  pnpm -C apps/api run role:set you@example.com OWNER
  ```
- **403 without banner**
  - Ensure the fetch wrapper emits `auth:403` and the `AuthBanners` component is mounted at layout root.
- **Role badge missing**
  - The header calls `/api/me` with `cache:'no-store'`. Verify endpoint returns `{ email, userId, role }`.
- **Buttons still clickable for Viewer**
  - UI checks `requires-write` class + `readOnly` flag from `useRBAC`. Confirm the hook returns `canWrite=false`.

---

### 4) API & Proxy (Dev)
- **Dev rewrites not applied**
  - `NEXT_PUBLIC_API_BASE` must be `http://localhost:3001`.
  - After changing, restart dev server:
    ```bash
    rm -rf apps/web/.next && pnpm -C apps/web dev
    ```
- **CORS / Preflight blocked**
  - API allows `OPTIONS/HEAD`. Verify you are calling the API through the same origin (`/boards`, `/columns`, `/issues`) instead of absolute cross-origin URLs in dev.
- **Network 404 but API is running**
  - Inspect Next.js `rewrites()` in `apps/web/next.config.ts` and make sure patterns include `/boards/*`, `/columns/*`, `/issues/*`, `/api/*` (excluding `/api/auth/*`).

---

### 5) Database / Prisma
- **Cannot connect to database**
  - Check `DATABASE_URL` and that Postgres is running (Docker or local).
- **Migrations / schema drift**
  ```bash
  pnpm -C apps/api prisma format
  pnpm -C apps/api prisma validate
  pnpm -C apps/api prisma migrate deploy   # or: prisma db push (early dev)
  ```
- **Prisma Client not generated**
  ```bash
  pnpm -C apps/api prisma generate
  ```
- **Pool exhausted / too many connections**
  - Use a smaller pool in dev: append `?connection_limit=5` (for PG 15+) or manage via PG config.

---

### 6) Kanban UI & DnD
- **Drag & drop not working**
  - If role is VIEWER, DnD is intentionally blocked.
  - Confirm DnD container uses `closestCenter` and `rectSortingStrategy` and the page state has items with stable `id`.
- **Columns not reordering after drop**
  - Network tab should show `POST /columns/reorder`. If absent, check column `id`s and active board.
- **Issues not reordering after cross-column move**
  - Both `POST /columns/:toId/reorder` and `POST /columns/:fromId/reorder` should fire.
- **Toast duplicates on 403**
  - The UI uses a banner + standardized toast. Ensure only the **event-based** banner runs; remove ad-hoc toasts in handlers.

---

### 7) Seed Helper (CLI)
- **Command not found**
  - Ensure `apps/api/package.json` has scripts:
  ```json
  { "scripts": { "role": "node scripts/role.js", "role:set": "node scripts/role.js set", "role:bulk": "node scripts/role.js bulk" } }
  ```
- **CSV format**
  - Either `email,ROLE` header or none. Example:
  ```csv
  email,role
  alice@example.com,ADMIN
  bob@example.com,VIEWER
  ```

---

### 8) Docker (local build)
- **Images build but won’t run**
  - These images are for local build verification only. For runtime, wire up `docker-compose` (DB/Redis) and provide envs.
- **Port conflicts**
  ```bash
  lsof -nP -iTCP:3000 -sTCP:LISTEN
  lsof -nP -iTCP:3001 -sTCP:LISTEN
  lsof -nP -iTCP:4000 -sTCP:LISTEN
  ```

---

### 9) Common HTTP Errors (Cheat Sheet)
| Code | Where | Meaning | Fix |
|-----:|------|---------|-----|
| 401 | API | Missing/invalid `apiToken` | Log in; ensure `Authorization: Bearer <token>` is present; secrets match |
| 403 | API | Role not allowed | Promote role; or switch account |
| 404 | API | Resource not found | Verify IDs/workspace; check rewrite path |
| 409 | API | Board delete restricted | Use `?cascade=true` or delete columns first |
| 422 | API | Payload invalid | Check required fields (`title`, `workspaceId`, etc.) |
| 500 | API | Server error (Prisma, etc.) | Check API logs; validate DB connection/migrations |

---

### 10) Production Notes (if you deploy later)
- Build:
  ```bash
  pnpm -C apps/web build && pnpm -C apps/web start
  pnpm -C apps/api build && pnpm -C apps/api start:prod
  ```
- Set absolute origins:
  - `NEXTAUTH_URL=https://your-domain`
  - Update GitHub OAuth callback to the production URL.
- Ensure HTTPS and correct cookie domain; clock skew will break JWT.
  
---

## Change History (highlights)
- Role badge in header with `/api/me` (no-store)
- Viewer read-only gating + DnD block
- Fetch wrapper with Bearer injection (non-GET) + 401/403 events
- 401/403 UX banners (sticky re-auth, subtle 403)
- Board delete 409 vs cascade path
- Role Seed CLI (set/bulk)

---

## License
MIT
