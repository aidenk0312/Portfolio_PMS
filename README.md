# Portfolio PMS — Project Management System
- TL;DR: 원격/협업 환경을 염두에 둔 칸반 기반 PMS를 Next.js + NestJS + Prisma + Postgres/Redis로 구현합니다.

## 주요 기능
- [x] Docker 기반 Postgres/Redis
- [x] Prisma 스키마/마이그레이션
- [x] /health, /health/db 헬스 체크
- [x] 프론트: API 프록시 설정(Next → Nest 3001) + 헬스 대시보드 페이지
- [ ] 보드/컬럼/이슈 CRUD
  - [ ] 보드 API
  - [ ] 컬럼 API
  - [ ] 이슈 API
- [x] 보드/컬럼/이슈 CRUD
  - [x] 보드 API
  - [x] 컬럼 API
  - [x] 이슈 API
- [ ] 프런트 칸반 UI (Drag & Drop)
- [ ] 인증(이메일/소셜), 조직/워크스페이스 권한
- [ ] 감사 로그 & 액티비티 피드
- [ ] CI/CD 및 배포

## 아키텍처
- **Frontend: Next.js(App Router, TS, Tailwind) — 예정**
- **Rewrites: `/api/*` → `http://localhost:3001/*`**
- **Backend: NestJS(Typescript) + Prisma**
- **DB/Cache: PostgreSQL 16, Redis 7 (Docker)**
- **Repo: pnpm + Turborepo 모노레포**
~~~text
apps/
  web/   # Next.js (추가 예정)
  api/   # NestJS + Prisma (헬스 엔드포인트 포함)
infra/
  docker-compose.yml
pnpm-workspace.yaml
turbo.json
~~~

## 빠른 시작
~~~text
pnpm i
docker compose -f infra/docker-compose.yml up -d
cp apps/api/.env.example apps/api/.env
cd apps/api && pnpm prisma migrate dev --name init
# -----
pnpm dev
# API: http://localhost:3001
~~~

## API 확인
### Boards
- `GET /boards?workspaceId=...`
- `GET /boards/:id`
- `POST /boards`
- `PATCH /boards/:id`
- `DELETE /boards/:id`

### Columns
- `GET /columns?boardId=...`
- `POST /columns`
- `PATCH /columns/:id`
- `DELETE /columns/:id`

### Issues
- `GET /issues?workspaceId=...&columnId=...`
- `POST /issues`
- `PATCH /issues/:id`
- `DELETE /issues/:id`

## 기술 선택 & 의사결정
- **모노레포: 프론트/백/공유 패키지 일원화로 협업·배포 단순화**
- **Prisma: 타입 안전한 DB 액세스 + 마이그레이션 이력 관리**
- **Docker: 팀/머신 간 개발환경 표준화 (한 줄로 DB/Redis 실행)**
- **NestJS: 모듈 구조/DI로 확장성과 테스트 용이성 확보**

## 트러블슈팅
- **포트 충돌 → infra/docker-compose.yml/main.ts에서 포트 조정**
- **Prisma 오류 → pnpm prisma format && pnpm prisma validate**
- **/api/* 404 →** `apps/web/next.config.ts` 저장 후 프론트 dev 서버 재시작**
- #### 빠른 스모크 테스트(curl)
```bash
# Workspace id 준비(Prisma Studio로 생성 후 복사)
WS=<your-workspace-id>

# 1) Board
BOARD_ID=$(curl -s -X POST http://localhost:3001/boards \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Sprint Board\",\"workspaceId\":\"$WS\"}" | jq -r '.id')

# 2) Column
COLUMN_ID=$(curl -s -X POST http://localhost:3001/columns \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Todo\",\"boardId\":\"$BOARD_ID\",\"order\":0}" | jq -r '.id')

# 3) Issue
curl -s -X POST http://localhost:3001/issues \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"첫 이슈\",\"workspaceId\":\"$WS\",\"columnId\":\"$COLUMN_ID\"}" | jq .
```

## 로드맵
- [ ] 보드/이슈 도메인 설계 문서 공개
- [ ] 칸반 UI + 낙관적 업데이트
- [ ] 인증/조직 권한 모델
- [ ] 감사 로그/웹소켓 알림
- [ ] GitHub Actions로 CI, 배포 파이프라인
