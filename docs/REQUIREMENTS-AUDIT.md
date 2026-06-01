# Requirements Audit — Simple Checkout Service

Source: `docs/Agentic Engineer Test.pdf`

---

## Acceptance Criteria

### Functional Requirements

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| AC-1 | Expose `POST /checkout` | ✅ Done | `adapters/in/http/checkout/checkout.controller.ts` |
| AC-2 | Request accepts a list of items | ✅ Done | `CheckoutRequestDto` with `ArrayMinSize(1)` validation |
| AC-3 | Each item has `name`, `unit_price`, `quantity` | ✅ Done | `CheckoutItemDto` with class-validator constraints |
| AC-4 | `subtotal` = Σ(unit_price × quantity) | ✅ Done | `calculateSubtotal()` in `core/domain/pricing.engine.ts` |
| AC-5 | `taxes` = 13% of subtotal | ✅ Done | `calculateTaxes()` — configurable via `PRICING_TAX_RATE` env var |
| AC-6 | `discount` = 10% if subtotal > 100, else 0 | ✅ Done | `calculateDiscount()` — configurable via `PRICING_DISCOUNT_THRESHOLD` / `PRICING_DISCOUNT_RATE` |
| AC-7 | `total` = subtotal + taxes − discount | ✅ Done | `calculateTotal()` |
| AC-8 | Response returns `subtotal`, `taxes`, `discount`, `total` | ✅ Done | `CheckoutResponseDto` |

All 8 functional acceptance criteria are satisfied.

---

## Non-Functional Requirements

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| NF-1 | Clarity and correctness over completeness | ✅ Done | Hexagonal architecture; pure domain layer; no framework imports in `core/` |
| NF-2 | Easy to extend as business rules evolve | ✅ Done | Swappable adapters via env vars; pricing config injected via `IPricingConfigProvider` port |
| NF-3 | Persistence layer required | ✅ Done | PostgreSQL via Prisma; `CheckoutSession` and `User` models persisted |
| NF-4 | Authentication required | ✅ Done | JWT auth guard on `POST /checkout`; `POST /auth/login` and `POST /auth/register` implemented |
| NF-5 | UI not required, bonus if included | ✅ Bonus done | Next.js frontend with login and checkout pages |
| NF-6 | Must work in a distributed architecture | ✅ Done | Each service (`api`, `web`) is independently containerized; Docker Compose wires them; env-only config |

---

## What Is Accomplished

### Core domain
- Pricing engine (`pricing.engine.ts`) is pure TypeScript — zero framework dependencies.
- Monetary arithmetic uses `Math.round(value * 100) / 100` — no raw float accumulation.
- `PricingConfig` value object drives all rates and thresholds; defaults match spec (13% tax, 10% discount over $100).
- Configurable at runtime via `PRICING_TAX_RATE`, `PRICING_DISCOUNT_THRESHOLD`, `PRICING_DISCOUNT_RATE` env vars.

### API
- `POST /checkout` — protected, validates input, calculates with injected pricing config, persists, returns result.
- `GET /checkout/history` — returns all past sessions for the authenticated user.
- `POST /auth/login` and `POST /auth/register` — JWT-based, bcrypt cost 12.
- `GET /health` — checks DB connectivity, returns 503 on failure.
- Rate limiting: 60 req/min global, 10 req/min on auth routes (`@nestjs/throttler`).
- `JWT_SECRET` missing → process throws on startup (no insecure fallback).
- `SHELL_ORIGIN` missing in production → process throws on startup.
- Swagger UI at `/api/docs` with bearer auth scheme.
- Global `ValidationPipe` (whitelist + forbid unknown properties).

### Persistence
- PostgreSQL schema: `User` and `CheckoutSession` with proper decimal types (`Decimal(12,2)`).
- Initial migration committed at `prisma/migrations/20260101000000_init/migration.sql`.
- Mock in-memory repository available for local dev without a database (`DB_PROVIDER=mock`).
- Seed service populates two test users and sample sessions on non-production boot.

### Authentication
- JWT adapter: issues tokens with 3600s expiry, validates on every protected request.
- Mock auth adapter mirrors JWT adapter for local dev (`AUTH_PROVIDER=mock`).
- `JwtAuthGuard` extracts and validates Bearer tokens, attaches `userId` to request context.
- Auth token persisted in `localStorage` on the frontend — survives page refresh.

### Infrastructure
- Multi-stage Docker builds for both `api` and `web` (non-root user, healthchecks).
- `docker-compose.yml` wires `postgres → api → web` with health-gated startup.
- pnpm workspaces + Turbo monorepo; each app owns its own `.env` file.
- `pnpm setup` script scaffolds both `.env` files from examples for new developers.

### Testing
- 34 tests across 4 suites — all green.
- Domain: `pricing.engine.spec.ts` — unit tests including custom config coverage.
- Application: `process-checkout.usecase.spec.ts` — use case logic with mock repo and config.
- Controllers: `checkout.controller.spec.ts`, `auth.controller.spec.ts` — supertest integration tests covering auth guard, validation, success and error paths.
- Jest `moduleNameMapper` configured so path aliases (`@domain/*`, `@ports/*`, etc.) resolve in tests.

### Frontend (bonus)
- Login page with Zod validation and JWT token handling.
- Checkout page with dynamic item rows, real-time subtotal, and result summary card.
- Auth context with `login()` / `logout()` — token persisted in `localStorage`.
- Component tests for login and checkout pages.

---

## Remaining Gaps

### Not yet addressed

| Item | Detail |
|------|--------|
| No structured logging | No request tracing or structured log output; only raw `console.error`. |
