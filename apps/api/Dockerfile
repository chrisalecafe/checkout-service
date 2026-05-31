FROM node:20-alpine AS builder
WORKDIR /app

RUN npm i -g pnpm

# Copy workspace manifests first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter @checkout/api

COPY apps/api ./apps/api

RUN pnpm --filter @checkout/api build
RUN pnpm --filter @checkout/api --prod deploy /app/deploy

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/deploy/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist

USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "dist/main.js"]
