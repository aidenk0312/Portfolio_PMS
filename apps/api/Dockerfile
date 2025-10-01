# -------- Builder --------
FROM node:20-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm i --frozen-lockfile
RUN pnpm -C apps/api prisma generate
RUN pnpm -C apps/api build

# -------- Runner --------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/package.json ./
COPY --from=builder /repo/apps/api/prisma ./prisma
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/node_modules/.prisma ./node_modules/.prisma
EXPOSE 4000
CMD ["node", "dist/main.js"]
