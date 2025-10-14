# Portfolio PMS — Project Management System

> **Elevator pitch**: A lightweight Kanban PMS with issue DnD and RBAC — optimized reorder transactions and polished 401/403 UX.

https://github.com/user-attachments/assets/c961bab4-b7ba-4510-b16b-701a1e9ebf87

A Kanban-based PMS designed for remote/collaborative teams. Built with **Next.js 15 (App Router, Tailwind)** and **NestJS 11 + Prisma**, backed by **PostgreSQL 16** and **Redis 7**. Authentication via **NextAuth v4 (GitHub OAuth)** with a **JWT session** that exposes an `apiToken` for API calls. Role-based access control (RBAC) supports **OWNER / ADMIN / MEMBER / VIEWER**.

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
- **Auth**: NextAuth v4 (GitHub OAuth), JWT session
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

**Dev rewrites (web)**  
Browser calls → **`/api/*`** (Next.js) → rewrites → API service routes:

- `/api/boards` → `${NEXT_PUBLIC_API_BASE}/boards`
- `/api/columns` → `${NEXT_PUBLIC_API_BASE}/columns`
- `/api/issues` → `${NEXT_PUBLIC_API_BASE}/issues`
- `/api/me` → `${NEXT_PUBLIC_API_BASE}/auth/me`

```mermaid
flowchart LR
  subgraph Web[Web (Next.js 15, App Router)]
    UI[Kanban UI
DnD, Role Badge, Banners]
    Fetch[apiFetch
(Bearer inject, 401/403 events)]
  end

  subgraph Auth[NextAuth v4 (GitHub OAuth)]
    GH[(GitHub OAuth)]
    Session[JWT Session
{ userId, apiToken }]
  end

  subgraph API[NestJS 11 + Prisma]
    Guards[JwtAuthGuard +
ScopedRolesGuard (RBAC)]
    Boards[/Boards/Columns/Issues/]
  end

  subgraph Data[Data Layer]
    PG[(PostgreSQL 16)]
    Redis[(Redis 7)]
  end

  UI --> Fetch
  Fetch -- GET /api/auth/session --> Session
  Fetch -- non-GET adds
Authorization: Bearer apiToken --> API
  Session <-- OAuth callback --> GH
  API --> Guards
  API --> Boards
  Boards --> PG
  API --> Redis
```

---

# Quick Start

> **Prereqs:** Node.js 18+ (20+ recommended), **pnpm 9+**, **Docker** (optional: local DB/Redis)

## 0) (Optional) Start local DB/Redis
```bash
docker compose -f infra/docker-compose.yml up -d
```

## 1) Install & set environment files
```bash
pnpm i
# create env files if they don't exist
cp apps/web/.env.local.example apps/web/.env.local || true
cp apps/api/.env.example apps/api/.env || true
```
Update the values as needed:
- **apps/web/.env.local**
- **apps/api/.env**

Notes:
- `NEXTAUTH_SECRET` must be **identical** in web & api.
- `NEXT_PUBLIC_API_BASE` should point to your API (default `http://localhost:3001`).

## 2) Database setup
```bash
pnpm -C apps/api prisma migrate deploy
pnpm -C apps/api run seed:demo
```

## 3) Run the apps
```bash
pnpm -w dev   # web :3000, api :3001
```

- Web: http://localhost:3000  
- API: http://localhost:3001

## 4) Health checks
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

Notes:
- `NEXTAUTH_SECRET` must match between **web** & **api**.
- `NEXT_PUBLIC_API_BASE` is used by the web dev proxy rewrites.

---

## Auth & RBAC

### GitHub OAuth App Setup
1. GitHub → Settings → Developer settings → **OAuth Apps** → **New OAuth App**
2. Homepage URL: `http://localhost:3000`
3. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Save and copy **Client ID** and **Client Secret** to `apps/web/.env.local`.

### NextAuth Token Injection Flow

```mermaid
sequenceDiagram
  autonumber
  participant U as User (Browser)
  participant W as Web (Next.js)
  participant NA as NextAuth (GitHub)
  participant API as API (NestJS)
  participant DB as PostgreSQL

  U->>W: Sign in with GitHub
  W->>NA: /api/auth/callback/github
  NA-->>W: JWT session { userId, apiToken }
  note right of W: session exposes apiToken

  U->>W: Create / Rename / Delete (non-GET)
  W->>API: fetch (Authorization: Bearer apiToken)
  API->>API: JwtAuthGuard verify token
  API->>API: ScopedRolesGuard check role (OWNER/ADMIN/MEMBER/VIEWER)
  API->>DB: CRUD / reorder in transaction
  DB-->>API: OK
  API-->>W: 200 (or 401/403)
  W-->>U: Render + banners (401/403)
```

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
pnpm -C apps/api run role:set you@example.com OWNER
pnpm -C apps/api run role:bulk ./emails.csv  # CSV: email,ROLE
```

---

## Kanban UX
- **URL**: `/boards` (or your route)
- **Board picker**: “Boards: N selected” for multi-select  
  - Single-board mode enables **column DnD (left↔right)**  
  - Issue DnD works in single- and multi-board views
- **Role badge**: header-right shows current role (color-coded)
- **Write actions**: `.requires-write` elements disabled for Viewer
- **Banners**
  - `401` expired session → sticky top banner with **Sign in again**
  - `403` insufficient role → subtle banner; no duplicate toasts

> **Screenshots**  
> <img width="1273" height="607" alt="Owner" src="https://github.com/user-attachments/assets/8dc5fef4-003c-47ba-81b3-66c3d05c6b01" /><br/>
> <img width="1271" height="604" alt="Viewer" src="https://github.com/user-attachments/assets/b99f831b-167e-4179-8ead-91820ac05ae4" />

---

## API Overview

> **Browser calls (through Next.js rewrites)**  
> `/api/boards`, `/api/columns`, `/api/issues` → proxied to the API base.

> **API service routes (NestJS)**  
> `/boards`, `/columns`, `/issues`

- **Boards**
  - `GET /api/boards?workspaceId=...`
  - `GET /api/boards/:id`
  - `GET /api/boards/:id/full`
  - `POST /api/boards`
  - `PATCH /api/boards/:id`
  - `DELETE /api/boards/:id[?cascade=true]`
- **Columns**
  - `GET /api/columns?boardId=...`
  - `POST /api/columns`
  - `PATCH /api/columns/:id`
  - `DELETE /api/columns/:id`
  - `POST /api/columns/:id/reorder` `{ "issueIds": string[] }`
  - `POST /api/columns/reorder` `{ "boardId": string, "columnIds": string[] }`
- **Issues**
  - `GET /api/issues?workspaceId=...&columnId=...`
  - `POST /api/issues`
  - `PATCH /api/issues/:id`
  - `DELETE /api/issues/:id`
- **Health**
  - `GET /health`, `GET /health/db`

---

## Docker (local build)

```bash
docker build -f apps/web/Dockerfile -t pms-web:local .
docker build -f apps/api/Dockerfile -t pms-api:local .
# web exposes :3000; api exposes :3001 (configurable via PORT)
```

---

# Troubleshooting (Extended)

## 1) Setup & Environment
- **Env files**
  - Web: `apps/web/.env.local`
  - API: `apps/api/.env`
  - After changing env, restart the Next.js dev server.
- **Generate a strong secret**
  ```bash
  openssl rand -base64 48 | tr -d '\n'
  ```
  Use the same value for **NEXTAUTH_SECRET** in both web & api.

---

## 2) Auth / NextAuth
- **OAuth callback mismatch**
  - GitHub OAuth → Authorization callback URL:
    - `http://localhost:3000/api/auth/callback/github`
- **Do NOT rewrite `/api/auth/*` to the backend**
  - In `apps/web/next.config.ts` keep `/api/auth/:path*` on the web app (or exclude it from rewrites).
- **401 on write**
  - Non-GET requests must have `Authorization: Bearer <apiToken>` (added by your fetch wrapper).
  - `NEXTAUTH_SECRET` must be identical in **web** & **api**.
- **403 banner not showing**
  - Ensure `AuthBanners` is mounted in the layout.
  - Ensure your fetch wrapper emits an `auth:403` event.

---

## 3) Dev Proxy / Rewrites
- **Proxy not applied**
  - `NEXT_PUBLIC_API_BASE=http://localhost:3001`
  - Restart dev server:
    ```bash
    rm -rf apps/web/.next && pnpm -C apps/web dev
    ```
- **CORS or absolute URL**
  - In dev, call browser APIs via relative paths (`/api/*`), letting Next.js proxy to the backend.

---

## 4) Prisma / Database
- **P3005: database not empty (baseline)**
  - For local reset:
    ```bash
    pnpm -C apps/api prisma migrate reset --force --skip-seed
    pnpm -C apps/api prisma migrate deploy
    ```
- **Prisma Client not generated**
  ```bash
  pnpm -C apps/api prisma generate
  ```
- **Port conflicts**
  ```bash
  lsof -nP -iTCP:5432 -sTCP:LISTEN
  lsof -nP -iTCP:6379 -sTCP:LISTEN
  kill -9 <PID>
  ```

---

## 5) Seeding / Roles
- **Quick seed (optional)**
  ```bash
  pnpm -C apps/api prisma migrate deploy
  pnpm -C apps/api run seed:demo
  ```
- **Grant roles**
  ```bash
  pnpm -C apps/api run role:set you@example.com OWNER
  pnpm -C apps/api run role:bulk ./emails.csv  # CSV: email,ROLE
  ```

---

## 6) Kanban UI & DnD
- **Drag & Drop not working**
  - VIEWER is intentionally read-only (no writes / no DnD).
  - Ensure each column/issue has a stable `id`.
- **Reorder not persisted after drop**
  - Network tab should show:
    - Columns: `POST /api/columns/reorder`
    - Issues:  `POST /api/columns/:id/reorder`

---

## 7) Tests
- **API e2e (Jest/Supertest)**
  - Use compatible versions (e.g., `jest@29`, `ts-jest@29`, `@types/jest@29`).
  - Ensure `jest` config points to your e2e spec folder and uses `ts-jest`.
- **Web e2e (Playwright)**
  - Install `@playwright/test`.
  - In `playwright.config.ts`, set `webServer` (to start Next dev) or set a `baseURL` to an already running server.
  - For VIEWER case, assert `.requires-write` elements are `disabled`.

---

## 8) Vercel (Deploy)
- **503: `MIDDLEWARE_RUNTIME_DEPRECATED`**
  - Remove or rename legacy `middleware.ts` and redeploy.

---

## 9) Logging / Debug
- **NextAuth debug**
  ```bash
  NEXTAUTH_DEBUG=true pnpm -C apps/web dev
  ```
- **API verbose**
  ```bash
  LOG_LEVEL=debug pnpm -C apps/api start:dev
  ```

---

## 10) HTTP Error Cheat Sheet
| Code | Meaning                    | Fix |
|-----:|----------------------------|-----|
| 401  | Missing/invalid `apiToken` | Log in; ensure `Authorization: Bearer <token>`; secrets match |
| 403  | Insufficient role          | Promote role (OWNER/ADMIN/MEMBER) or switch account |
| 404  | Resource not found         | Verify IDs/workspace; check rewrite path |
| 409  | Board delete restricted    | Use `?cascade=true` or delete child resources first |
| 422  | Invalid payload            | Check required fields (`title`, `workspaceId`, etc.) |
| 500  | Server error               | Check API logs; DB connection; migrations |

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
