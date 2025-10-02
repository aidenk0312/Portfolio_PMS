# Portfolio PMS — Project Management System
- A Kanban-based PMS designed for remote/collaborative teams, built with Next.js + NestJS + Prisma + PostgreSQL/Redis.
  
## Features
- [x] Dockerized PostgreSQL 16 / Redis 7
- [x] Prisma schema & migrations
- [x] Health checks: /health, /health/db
- [x] Kanban board
  - Drag & drop cards within/between columns
  - Horizontal column drag & drop
  - Create / Rename / Delete columns
  - Create / Rename / Delete issues
  - Deterministic ordering persisted in DB
  - **Multi-board select** (merge view or single-board focus)
  - **Bulk:** Clear all columns & issues of the active board
- [x] Boards/Columns/Issues CRUD (NestJS + Prisma)
- [x] Frontend API integration (App Router) and health dashboard
- [x] **UI v2:** Tailwind design tokens, header/actions polish, button/input/card primitives
- [x] Dev proxy rewrites for API (`/api/*`, `/boards/*`, `/columns/*`, `/issues/*`)
- [x] Docker build (web/api) — Next.js standalone build, NestJS dist
- [x] Auth (GitHub via NextAuth) & minimal RBAC (GET open; write requires JWT)
- [ ] Audit log & activity feed
- [ ] CI/CD & deployment

## Architecture
- **Frontend:** Next.js (App Router, TS, Tailwind)
- **Dev rewrites:** `/api/*`, `/boards/*`, `/columns/*`, `/issues/*` → `${NEXT_PUBLIC_API_BASE}` (default: `http://localhost:3001`)
- **Backend:** NestJS (TypeScript) + Prisma
- **DB/Cache:** PostgreSQL 16, Redis 7 (Docker)
- **Repo:** pnpm + Turborepo monorepo
~~~text
apps/
  web/   # Next.js
  api/   # NestJS + Prisma
infra/
  docker-compose.yml
pnpm-workspace.yaml
turbo.json
~~~

## Docker (build only)
> Local image build only (deployment out of scope).

~~~text
# from repo root
docker build -f apps/web/Dockerfile -t pms-web:local .
docker build -f apps/api/Dockerfile -t pms-api:local .

# Notes
Web container exposes 3000
API container exposes 4000 (dev server runs on 3001)
~~~

## Environment Variables
- **apps/web/.env.local**
~~~text
NEXT_PUBLIC_WORKSPACE_ID=ws_local
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-32+chars
GITHUB_ID=<your_github_oauth_client_id>
GITHUB_SECRET=<your_github_oauth_client_secret>
~~~
- **apps/api/.env**
~~~text
DATABASE_URL=postgresql://app:app@127.0.0.1:5432/appdb?schema=public
REDIS_URL=redis://localhost:6379
PORT=3001

# must match web's value
NEXTAUTH_SECRET=replace-with-32+chars
~~~

## Run
~~~text
pnpm i
pnpm -r dev
~~~
- Web: http://localhost:3000
- API: http://localhost:3001
- Health checks:
~~~text
curl -s http://localhost:3001/health
curl -s http://localhost:3001/health/db

Dev proxy note: apps/web/next.config.ts proxies
/api/*, /boards/*, /columns/*, /issues/* to ${NEXT_PUBLIC_API_BASE}.
If you change this value, restart the web dev server.
~~~

## Auth & Minimal RBAC
- **Login**: GitHub OAuth via NextAuth (`/api/auth/[...nextauth]`)
- **Session**: JWT strategy; session includes `userId` and `apiToken` (HS256, `NEXTAUTH_SECRET`)
- **User upsert**: On successful OAuth, web calls `POST /auth/upsert { email, name?, image? }` to create/update a User
- **Route guard (web)**: `/kanban` requires auth; unauthenticated users are redirected to `/login`
- **Write protection (API)**: Global guard
  - `GET`/`HEAD`/`OPTIONS` → allowed without token
  - `POST`/`PATCH`/`DELETE` → require `Authorization: Bearer <apiToken>`
- **Bearer injection (web)**: Non-GET fetches automatically attach `Authorization` from session

**GitHub OAuth setup**
- OAuth App → Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
- Copy **Client ID** → `GITHUB_ID`, generate **Client Secret** → `GITHUB_SECRET`

## Kanban (Web)
- URL: `http://localhost:3000/kanban`
- Requires: `NEXT_PUBLIC_WORKSPACE_ID`, `NEXT_PUBLIC_API_BASE`
- Board picker:
  - Click “Boards: N selected” to multi-select boards
  - **Single-board mode** enables column DnD (left↔right)
  - Issue DnD is always available (within column up/down and cross-column)
- New Board:
  - “New Board…” creates a board in the current workspace
    
### Header actions
- **Boards: N selected** — open board picker (multi-select)
- **New Board…** — create a board in current workspace
- **Delete Board…** — delete active board (option: cascade)
- **Clear Columns…** — bulk delete all columns & issues in the active board
- **Refresh** — reload boards/columns/issues

## UI v2 (Tailwind v4)
Design tokens & primitives used across the app.
- **Tokens:** `brand`, `surface.{0,1,2}`, `text.{DEFAULT,mute}`, `danger/ok/warn`
- **Radii & Shadows:** `rounded-xl/2xl`, `shadow-card/overlay`
- **Primitives:** `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.input`, `.card`, `.section`, `.badge-*`
- **Header:** “Kanban — Project Management System”, visible labels for **New Board…**, **Delete Board…**, **Clear Columns…**, **Refresh**

## Behavior
- Column DnD (single-board mode only)
  - Uses @dnd-kit/core + @dnd-kit/sortable (closestCenter, rectSortingStrategy)
  - On drop, compute the board’s column ID array and POST /columns/reorder { boardId, columnIds }
  - Optimistic UI first, then server sync

- Issue DnD
  - Same column: POST /columns/:id/reorder { issueIds }
  - Cross-column: reorder both target and source columns
  - Sorting rule: (order ASC, createdAt ASC)
  - Optimistic UI first, then server sync

- Delete semantics
  - DELETE /issues/:id, /columns/:id, /boards/:id return **204 No Content**
  - Boards support `?cascade=true`
  - 

## API Overview
- Boards
  - GET /boards?workspaceId=...
  - GET /boards/:id
  - GET /boards/:id/full
  - POST /boards
  - PATCH /boards/:id
  - DELETE /boards/:id[?cascade=true]  ← returns 204
- Columns
  - GET /columns?boardId=...
  - POST /columns
  - PATCH /columns/:id
  - DELETE /columns/:id  ← returns 204
  - POST /columns/:id/reorder
    - Body: { "issueIds": ["<issue-id-1>", ...] }
  - POST /columns/reorder
    - Body: { "boardId": "<board-id>", "columnIds": ["<col-id-1>", ...] }
- Issues
  - GET /issues?workspaceId=...&columnId=...
  - POST /issues
  - PATCH /issues/:id
  - DELETE /issues/:id  ← returns 204

## Deletion Policy
| Relation            | onDelete | Rationale                              |
|---------------------|---------:|-----------------------------------------|
| Issue → BoardColumn | CASCADE  | Deleting a column removes its issues    |
| Comment → Issue     | CASCADE  | Deleting an issue removes its comments  |
| BoardColumn → Board | RESTRICT | Safer default; cascade via API opt-in   |

### DELETE Responses
- DELETE /issues/:id → **204 No Content**. Compacts `order` among remaining siblings.
- DELETE /columns/:id → **204 No Content**. Issues removed via DB CASCADE.
- DELETE /boards/:id → RESTRICT by default; `?cascade=true` → **204 No Content** to remove columns/issues.

## Deterministic Ordering (Server)
- Columns sorted by order ASC
- Issues sorted by (order ASC, createdAt ASC)
- POST /columns/reorder: validates boardId/columnIds and updates within a transaction
- PATCH /issues/:id: when moving to a new column, assigns the next order in that column

## Verification Snippets (curl)
~~~text
# 1) workspace/board
WS=$(grep -oE '^NEXT_PUBLIC_WORKSPACE_ID=.*' apps/web/.env.local | cut -d= -f2)
curl -s "http://localhost:3001/boards?workspaceId=$WS" | jq
BOARD_ID=$(curl -s "http://localhost:3001/boards?workspaceId=$WS" | jq -r '.[0].id')

# 2) list columns (by order)
curl -s "http://localhost:3001/columns?boardId=$BOARD_ID" \
  | jq -r 'sort_by(.order) | .[] | "\(.order)\t\(.name)\t\(.id)"'

# 3) reverse columns
REV=$(curl -s "http://localhost:3001/columns?boardId=$BOARD_ID" \
  | jq -c 'sort_by(.order) | [.[].id] | reverse')

curl -i -X POST "http://localhost:3001/columns/reorder" \
  -H "content-type: application/json" \
  -d "{\"boardId\":\"$BOARD_ID\",\"columnIds\":$REV}"

# 4) reorder issues inside a column
COL_ID=$(curl -s "http://localhost:3001/columns?boardId=$BOARD_ID" | jq -r '.[0].id')
ISS_LIST=$(curl -s "http://localhost:3001/columns?boardId=$BOARD_ID" \
  | jq -c '.[] | select(.id=="'"$COL_ID"'") | .issues | [.[].id]')
curl -i -X POST "http://localhost:3001/columns/$COL_ID/reorder" \
  -H "content-type: application/json" \
  -d "{\"issueIds\":$ISS_LIST}"

# 5) delete issue (204 expected)
IID=$(curl -sS -X POST http://localhost:3001/issues \
  -H 'Content-Type: application/json' \
  -d '{"title":"tmp","workspaceId":"'"$WS"'"}' | jq -r .id)
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "http://localhost:3001/issues/$IID"  # 204

# 6) delete board cascade (204 expected)
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "http://localhost:3001/boards/$BOARD_ID?cascade=true"  # 204
~~~

## Test (API e2e)
~~~text
cd apps/api
pnpm run test:e2e
# or a single file:
pnpm run test:e2e:path
~~~

## Troubleshooting
- 400 columnIds is required
  - Guard against empty payloads in the frontend before calling /columns/reorder.
  - Ensure data-col-id exists and the drag start sets the __COLUMN__:<id> token.
- GET /boards?workspaceId=... returns 404 or empty
  - NEXT_PUBLIC_WORKSPACE_ID must exist in DB; create a board/columns first if needed.
- Port in use (EADDRINUSE)
  - lsof -nP -iTCP:3001 -sTCP:LISTEN and kill the process.
- Prisma schema problems
  - pnpm prisma format && pnpm prisma validate
  - Migrations: pnpm prisma migrate deploy (or pnpm prisma db push for early dev)
- TypeScript strict errors (e.g., TS2339 on never)
  - Add explicit generics to arrayMove/map/find
  - Initialize state with typed empty arrays, e.g. useState<Type[]>([])
  - In setState reducers, clone with typed maps: prev.map<T>(...) to avoid never narrowing
- Dev 404 / ECONNREFUSED
  - Symptoms: 404 or proxy failure on `/boards`, `/columns`, `/issues`
  - Checklist:
    1) API is running (`PORT=3001`)
    2) `apps/web/.env.local` → `NEXT_PUBLIC_API_BASE=http://localhost:3001`
    3) Restart web dev server (`pnpm -C apps/web dev`)
    4) Confirm rewrites are applied in `apps/web/next.config.ts`
- Redirect to /auth/error or 404
  - Ensure `apps/web/next.config.ts` does **not** proxy `/api/auth/*`.
  - GitHub OAuth callback must be exactly: `http://localhost:3000/api/auth/callback/github`.
- Write ops return 401
  - Login first; confirm `apiToken` exists in session.
  - Check request headers include `Authorization: Bearer <...>`.
  - API must have `NEXTAUTH_SECRET` equal to web’s value.
- Still proxying to backend for /api/auth/
  - Restart web dev server after changing rewrites: `rm -rf apps/web/.next && pnpm -C apps/web dev`.
- CORS preflight blocked
  - API allows `OPTIONS/HEAD`; ensure your browser shows 200/204 for preflight.
 
### util._extend Deprecation Warning
- Next dev warning; harmless and can be ignored. 

## Change History (Summary)
- Optimistic UI with server synchronization
- Eliminated setState timing races by sending IDs from a local snapshot
- Unified drop-index calculation by midpoint for both columns and issues
- API guarantees deterministic listing and transactional reorders
- Delete policies (CASCADE/RESTRICT) + 204 responses on DELETE
