# ADR-001: Checkout Service Architecture

| Field       | Detail                        |
|-------------|-------------------------------|
| **ID**      | ADR-001                       |
| **Status**  | Accepted                      |
| **Date**    | 2025-05-30 (updated 2026-05-30) |
| **Authors** | Engineering team              |

---

## Context

Build a lightweight checkout service for an MVP commerce workflow. Expose `POST /checkout` to calculate subtotal, taxes, discounts, and total from a list of items. Requirements: persistence, authentication, distributed architecture, easy to extend. UI is a bonus.

---

## Decisions

### 1. Language + Framework: TypeScript + NestJS

NestJS over Fastify: native DI container maps cleanly to hexagonal ports/adapters, `@UseGuards` enforces auth at the framework level, and the module system enforces domain boundaries.

### 2. Internal Architecture: Hexagonal (Ports & Adapters)

Ports are explicit contracts. The core never imports anything external. Adapters are swappable by configuration.

```
core/
  domain/          — pure entities and business rules, zero dependencies
  ports/in/        — IProcessCheckout
  ports/out/       — ICheckoutRepository, IAuthProvider
  application/     — use cases

adapters/
  in/http/         — NestJS controllers, DTOs, Guards
  out/db/          — ICheckoutRepository implementations (postgres, dynamo, mongo)
  out/auth/        — IAuthProvider implementations (jwt, cognito, auth0, firebase)
```

Dependency rule: `domain ← application ← adapters`. Domain imports nothing.

### 3. Persistence: PostgreSQL with swappable adapter

PostgreSQL via **Prisma** for MVP. `items` stored as JSONB. Swappable to DynamoDB or MongoDB via `DB_PROVIDER` env var — no use-case changes required.

TypeORM was removed (2026-05-30): Prisma provides a type-safe generated client, a declarative schema (`prisma/schema.prisma`), and first-class migration tooling. TypeORM's `synchronize: true` was unsafe for production and its decorator-heavy entity syntax polluted adapter files with ORM concerns.

### 4. Authentication: swappable adapter over IAuthProvider

Local JWT (HS256) for MVP. Auth0, Cognito, or Firebase activated via `AUTH_PROVIDER` env var.

### 5. Frontend: Next.js single app (bonus UI)

~~Microfrontend architecture with Webpack Module Federation~~ — replaced with a single Next.js (App Router) application. Module Federation was appropriate for a multi-team platform but adds significant complexity with no benefit at MVP scale where UI is optional. Next.js provides routing, SSR, and a straightforward deploy to Vercel.

```
apps/web/
├── app/login/page.tsx
└── app/checkout/page.tsx
```

### 6. Cloud Infrastructure

| Environment | Backend  | Database        | Frontend |
|-------------|----------|-----------------|----------|
| MVP         | Railway  | Supabase (free) | Vercel   |
| AWS         | ECS      | RDS             | CloudFront |
| GCP         | Cloud Run| Supabase        | Cloud Run |

Switching stacks requires only env var changes.

### 7. Monorepo: Turborepo

```
checkout-platform/
├── apps/
│   ├── api/    — NestJS
│   └── web/    — Next.js (bonus)
└── turbo.json
```

---

## Consequences

**Positive:** core is independent of framework/DB/auth; adding business rules touches only `pricing.engine.ts`; cloud-portable via env vars; stateless and horizontally scalable.

**Negative:** hexagonal architecture adds more files than a standard NestJS boilerplate; the upfront cost is higher but the extension cost is lower.
