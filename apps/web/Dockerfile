# -------- Builder --------
FROM node:20-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm i --frozen-lockfile
RUN pnpm -C apps/web build

# -------- Runner --------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
