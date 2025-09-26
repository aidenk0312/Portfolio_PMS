# Portfolio PMS — Project Management System
- A Kanban-based PMS designed for remote/collaborative teams, built with Next.js + NestJS + Prisma + PostgreSQL/Redis.

## Features
- [x] Dockerized PostgreSQL 16 / Redis 7
- [x] Prisma schema & migrations
- [x] Health checks: /health, /health/db
- [x] Kanban Drag & Drop
 - Issues: reorder within a column and move across columns
 - Columns: horizontal drag & drop (reorder)
- [x] Boards/Columns/Issues CRUD (NestJS + Prisma)
- [x] Frontend API integration (App Router) and health dashboard
- [ ] Auth (email/social), org/workspace permissions
- [ ] Audit log & activity feed
- [ ] CI/CD & deployment

## Architecture
- **Frontend: Next.js(App Router, TS, Tailwind) — 예정**
- **Rewrites: `/api/*` → `http://localhost:3001/*`**
- **Backend: NestJS(Typescript) + Prisma**
- **DB/Cache: PostgreSQL 16, Redis 7 (Docker)**
- **Repo: pnpm + Turborepo 모노레포**
~~~text
apps/
  web/   # Next.js
  api/   # NestJS + Prisma
infra/
  docker-compose.yml
pnpm-workspace.yaml
turbo.json
~~~

## Environment Variables
- **apps/web/.env.local**
~~~text
NEXT_PUBLIC_WORKSPACE_ID=ws_local
NEXT_PUBLIC_API_BASE=http://localhost:3001
~~~
- **apps/api/.env**
~~~text
DATABASE_URL=postgresql://app:app@127.0.0.1:5432/appdb?schema=public
REDIS_URL=redis://localhost:6379
PORT=3001
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
~~~

## Kanban (Web)
- URL: `http://localhost:3000/kanban`
- Requires: `NEXT_PUBLIC_WORKSPACE_ID` , `NEXT_PUBLIC_API_BASE`

## Behavior
- Column DnD
   - Drag token __COLUMN__:<id> distinguishes column drags from issue drags.
   - Compute insertIndex by comparing mouse X to each column’s horizontal midpoint.
   - Apply optimistic UI from a deep-copied snapshot, then call
   - POST /columns/reorder { boardId, columnIds }.
- Issue DnD
   - Compute insertIndex by Y midpoint between items.
   - Same-column: POST /columns/:id/reorder { issueIds }
   - Cross-column: call reorder for both target and source columns
   - When dragging down within same column: if srcIdx < destIdx, decrement destIdx by 1.

## API Overview
- Boards
   - GET /boards?workspaceId=...
   - GET /boards/:id
   - POST /boards
   - PATCH /boards/:id
   - DELETE /boards/:id
- Columns
   - GET /columns?boardId=...
   - POST /columns
   - PATCH /columns/:id
   - DELETE /columns/:id
   - POST /columns/:id/reorder
     - Body: { "issueIds": ["<issue-id-1>", ...] }
   - POST /columns/reorder
     - Body: { "boardId": "<board-id>", "columnIds": ["<col-id-1>", ...] }
- Issues
   - GET /issues?workspaceId=...&columnId=...
   - POST /issues
   - PATCH /issues/:id
   - DELETE /issues/:id

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
~~~

## Deterministic Ordering (Server)
- Columns sorted by order ASC
- Issues sorted by (order ASC, createdAt ASC)
- POST /columns/reorder: validates boardId/columnIds and updates within a transaction
- PATCH /issues/:id: when moving to a new column, assigns the next order in that column

## Troubleshooting
- 400 columnIds is required
  - Guard against empty payloads in the frontend before calling /columns/reorder.
  - Ensure data-col-id exists and the drag start sets the __COLUMN__:<id> token.
- GET /boards?workspaceId=... returns 404
  - NEXT_PUBLIC_WORKSPACE_ID must exist in DB; create a board/columns first if needed.
- Port in use (EADDRINUSE)
  - lsof -nP -iTCP:3001 -sTCP:LISTEN and kill the process.
- Prisma schema problems
  - pnpm prisma format && pnpm prisma validate
  - Migrations: pnpm prisma migrate deploy (or pnpm prisma db push for early dev)

## Change History (Summary)
- Optimistic UI with server synchronization
- Eliminated setState timing races by sending IDs from a local snapshot
- Unified drop-index calculation by midpoint for both columns and issues
- API guarantees deterministic listing and transactional reorders
