# Stage 1: Builder
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable pnpm

COPY . .

RUN pnpm install --frozen-lockfile && \
    cd apps/ws && pnpm build

# Stage 2: Runner
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable pnpm && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 wsserver

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ws/package.json ./apps/ws/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder --chown=wsserver:nodejs /app/apps/ws/dist ./apps/ws/dist

USER wsserver

WORKDIR /app/apps/ws

EXPOSE 8080

CMD ["node", "dist/index.js"]