FROM node:20-alpine AS builder
WORKDIR /app

RUN npm i -g pnpm

# Copy workspace manifests first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --filter @checkout/web

COPY apps/web ./apps/web

# Baked into the Next.js bundle at build time — must be a build-arg, not a runtime env var
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @checkout/web build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${PORT:-3000}/ || exit 1
CMD ["node", "apps/web/server.js"]
