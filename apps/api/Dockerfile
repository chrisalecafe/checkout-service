FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl
RUN npm i -g pnpm

# Copy workspace manifests first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/api/prisma ./apps/api/prisma

RUN pnpm install --frozen-lockfile --filter @checkout/api

COPY apps/api ./apps/api

RUN pnpm --filter @checkout/api build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl
RUN npm i -g pnpm

# Install production deps — packages land in /app/apps/api/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/api/prisma ./apps/api/prisma

RUN pnpm install --frozen-lockfile --filter @checkout/api --prod
# postinstall runs `prisma generate` automatically — no extra step needed

# Copy compiled output next to its node_modules so Node resolution works
COPY --from=builder /app/apps/api/dist ./apps/api/dist

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${PORT:-4000}/health || exit 1
CMD ["node", "apps/api/dist/main.js"]
