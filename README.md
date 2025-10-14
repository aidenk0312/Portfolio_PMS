
# Portfolio PMS — Project Management System

<p align="center">
  <a href="https://YOUR_WEB_URL" target="_blank" rel="noopener">
    <img alt="Open Demo" src="https://img.shields.io/badge/Open%20Demo-live-green?style=for-the-badge">
  </a>
  <a href="https://YOUR_WEB_URL/demo.mp4" target="_blank" rel="noopener" style="margin-left:8px">
    <img alt="Watch 1-min demo" src="https://img.shields.io/badge/Watch-1%E2%80%91min%20demo-000?style=for-the-badge">
  </a>
</p>

**Demo accounts (GitHub OAuth, role by email)**

| Role   | Email               | How to seed / promote                                     |
|--------|---------------------|-----------------------------------------------------------|
| OWNER  | owner@example.com   | `pnpm -C apps/api run role:set owner@example.com OWNER`  |
| VIEWER | viewer@example.com  | `pnpm -C apps/api run role:set viewer@example.com VIEWER`|

A Kanban-based PMS designed for remote/collaborative teams. Built with **Next.js 15 (App Router, Tailwind)** and **NestJS 11 + Prisma**, backed by **PostgreSQL 16** and **Redis 7**. Authentication via **NextAuth v5 (GitHub OAuth)** with a **JWT session** that exposes an `apiToken` for API calls. Role-based access control (RBAC) supports **OWNER / ADMIN / MEMBER / VIEWER**.

> Replace placeholders with your assets:
> - Put a hero screenshot at `apps/web/public/images/kanban-hero.png` and link it below.
> - Put a second board screenshot at `apps/web/public/images/kanban-boards.png`.
> - Put your short demo clip at `apps/web/public/demo.mp4` and update the button URL above (`/demo.mp4`).

---

## Contents
- [Live Demo & Accounts](#live-demo--accounts)
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
- [Troubleshooting](#troubleshooting-extended)
- [Security & Limitations](#security--limitations)
- [Change History (highlights)](#change-history-highlights)
- [License](#license)

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

> <img src="apps/web/public/images/kanban-hero.png" alt="Kanban UI" width="960"/>

---

## Quick Start
```bash
pnpm i
docker compose -f infra/docker-compose.yml up -d
pnpm -w dev
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
| Resource \\ Action     | Read | Create | Update | Delete | Reorder | Bulk Clear | Delete Board (cascade) |
|--------------------------|:----:|:------:|:-----:|:------:|:-------:|:----------:|:-----------------------:|
| **OWNER**                |  ✅  |   ✅   |   ✅  |   ✅   |   ✅    |     ✅     |           ✅            |
| **ADMIN**                |  ✅  |   ✅   |   ✅  |   ✅   |   ✅    |     ✅     |           ✅            |
| **MEMBER**               |  ✅  |   ✅   |   ✅  |   ✅   |   ✅    |     ✅     |           ❌            |
| **VIEWER**               |  ✅  |   ❌   |   ❌  |   ❌   |   ❌    |     ❌     |           ❌            |

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

> <img src="apps/web/public/images/kanban-boards.png" alt="Board picker and DnD" width="960"/>

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

### Live demo 503: `MIDDLEWARE_RUNTIME_DEPRECATED` (Vercel)
- Remove legacy Edge `middleware.ts` or refactor it to Node.js runtime.
- Ensure Next.js >= 15 and no experimental Edge middleware is enabled.
- Redeploy after removing/renaming `apps/web/src/middleware.ts` (if present).

### Setup & Environment
- Wrong env file path → web: `apps/web/.env.local`, api: `apps/api/.env`
- Restart dev servers after env change.
- Strong secret for both sides:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Auth / OAuth / NextAuth
- Callback must be exactly `http://localhost:3000/api/auth/callback/github` (prod는 Vercel URL)
- 401 on write → login + check `Authorization: Bearer <token>`
- Avoid proxying `/api/auth/*` via rewrites

### RBAC / Permissions
- Viewer cannot write by design → promote with Seed CLI
- 403 banner requires fetch wrapper events + `AuthBanners` mount
- Role badge fetches `/api/me` with `cache:'no-store'`

### API & Proxy
- `NEXT_PUBLIC_API_BASE=http://localhost:3001` in web
- Restart dev server after change:
```bash
rm -rf apps/web/.next && pnpm -C apps/web dev
```

### Database / Prisma
```bash
pnpm -C apps/api prisma format
pnpm -C apps/api prisma validate
pnpm -C apps/api prisma migrate deploy
```

### Kanban UI & DnD
- VIEWER blocks DnD
- Column reorder → `POST /columns/reorder`
- Issue cross-column move → reorder both columns

### Common HTTP Errors
| Code | Meaning | Fix |
|-----:|--------|-----|
| 401  | Missing/invalid token | Log in; ensure Bearer header |
| 403  | Role not allowed | Promote role |
| 404  | Resource not found | Check IDs & rewrites |
| 409  | Board delete restricted | Use `?cascade=true` or clean columns |
| 422  | Invalid payload | Check required fields |
| 500  | Server error | Inspect API logs & DB connection |

---

## Security & Limitations
Learning-focused project; **not** production-hardened. Missing: password recovery, rate limit, Sentry, WAF, privacy review, backups, zero-downtime migrations.

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
