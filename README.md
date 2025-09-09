# Portfolio PMS — Project Management System
- TL;DR: 원격/협업 환경을 염두에 둔 칸반 기반 PMS를 Next.js + NestJS + Prisma + Postgres/Redis로 구현합니다.

## 주요 기능
- [x] Docker 기반 Postgres/Redis
- [x] Prisma 스키마/마이그레이션
- [x] /health, /health/db 헬스 체크
- [x] 칸반 Drag & Drop (이슈 정렬/이동)
- [x] 프론트: API 프록시 설정(Next → Nest 3001) + 헬스 대시보드 페이지
- [x] 보드/컬럼/이슈 CRUD
  - [x] 보드 API
  - [x] 컬럼 API
  - [x] 이슈 API
- [ ] 인증(이메일/소셜), 조직/워크스페이스 권한
- [ ] 감사 로그 & 액티비티 피드
- [ ] CI/CD 및 배포

## 웹 프론트 (Kanban)
- 경로: `http://localhost:3000/kanban`
- 요구 환경변수: `apps/web/.env.local` → `NEXT_PUBLIC_WORKSPACE_ID=<워크스페이스ID>`
- 서버 연동:
  - `PATCH /issues/:id` (컬럼 변경)
  - `POST /columns/:id/reorder` (해당 컬럼 내 이슈 순서 반영)

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
- **포트 충돌 → infra/docker-compose.yml/main.ts에서 포트 조정 (1H)**
- **Prisma 오류 → pnpm prisma format && pnpm prisma validate (1H)**
- **Kanban Drag & Drop 후 새로고침 시 순서가 되돌아가는 문제 (2일 소요)**
  1) 증상
    - 카드 순서를 바꿔도 새로고침하면 원래대로 복귀
    - 컬럼 간 이동도 새로고침 시 원복
    - `/columns/:id/reorder`는 200인데 UI가 반영되지 않음
  2) 원인
    - 프론트에서 setState 직후의 상태에 의존해 서버로 순서 배열을 보내면,
      React 배칭/비동기 타이밍에 따라 잘못된 배열이 전송될 수 있음.
    - 즉, 드롭 결과를 로컬 스냅샷으로 확정한 뒤 그 스냅샷 기반으로 reorder 호출해야 함
  3) 해결 (Web)
    - drop 시 **현재 columns의 deep copy로 'next' 스냅샷** 생성
    - 스냅샷에서 from/to 배열을 직접 수정해 최종 순서를 확정
    - `setColumns(next)`로 즉시 UI 반영
    - 스냅샷에서 만든 `toIds`/`fromIds`로 `/columns/:id/reorder` 호출
    - 성공/실패 모두 `load()`로 DB 상태 재동기화
    - 같은 컬럼 내에서는 `srcIdx < destIdx`면 `destIdx -= 1` 보정
  4) 해결 (API)
    - `ColumnsService.findMany`: issues 정렬 `order ASC, createdAt ASC`
    - `ColumnsService.reorder`: 전달된 `issueIds` 검증 후, 트랜잭션으로 `columnId`와 `order` 동시 갱신
    - `IssuesService.update`: 컬럼 변경 시 대상 컬럼의 다음 `order` 자동 부여
