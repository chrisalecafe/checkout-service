# SAD-001: Software Architecture Document
## Simple Checkout Service

| Field       | Detail      |
|-------------|-------------|
| **Version** | 1.0.0       |
| **Status**  | Approved    |
| **Date**    | 2026-05-30  |
| **References** | ADR-001, SRS-001 |

---

## 1. Overview

The checkout service is a stateless NestJS microservice that calculates checkout totals, persists sessions, and authenticates requests via JWT. A Next.js web app provides a bonus UI. Both are packaged as Docker images and deployable to Railway (MVP), AWS, or GCP by changing environment variables only.

---

## 2. Architectural Style

**Hexagonal Architecture (Ports & Adapters).**

The business core has zero dependencies on any framework or infrastructure library. All I/O crosses a port interface. Adapters implement ports and are swapped via env vars — no code changes required to change the database or auth provider.

Dependency rule: arrows always point inward toward the business core.

```mermaid
graph RL
    Domain["Domain Core<br/>(Business Rules / Entities)"]
    Application["Application Layer<br/>(Use Cases / Ports)"]
    Adapters["Adapters Layer<br/>(Prisma / Controllers)"]
    Infra["Framework & Infrastructure<br/>(NestJS / Express / Node.js)"]

    Infra --> Adapters
    Adapters --> Application
    Application --> Domain

    classDef core fill:#fdf2f8,stroke:#ec4899,stroke-width:2px,color:#9d174d;
    classDef app fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#065f46;
    classDef adapt fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e40af;
    classDef infra fill:#f9fafb,stroke:#9ca3af,stroke-width:2px,color:#374151;

    class Domain core;
    class Application app;
    class Adapters adapt;
    class Infra infra;
```

The core (`Domain` & `Application`) is contained at the center and has zero coupling to infrastructure (Database, Web Framework, Auth Providers). Communication with the external world is exclusively done through defined contracts (**Ports**). Any external system implements these contracts through pluggable modules (**Adapters**).

---

## 3. System Context

```mermaid
graph TD
    %% Custom Styles
    classDef client fill:#f5f3ff,stroke:#8b5cf6,stroke-width:2px,color:#4c1d95;
    classDef api fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;
    classDef db fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#064e3b;
    classDef ext fill:#fff7ed,stroke:#f97316,stroke-width:2px,color:#7c2d12;
    classDef port fill:#ffffff,stroke:#6b7280,stroke-width:1px,stroke-dasharray: 4;

    subgraph UserFacing ["User Interface & Consumers"]
        NextJS["Next.js Web App<br/>(Client UI on :3000)"]:::client
        ExternalClient["External API Consumer<br/>(Mobile / Other Clients)"]:::client
    end

    subgraph Service ["Checkout Microservice (NestJS on :4000)"]
        CheckoutAPI["API Entry Controllers<br/>(Auth, Checkout, Health)"]:::api
        
        subgraph Core ["Ports & Core Domain"]
            IProcess["IProcessCheckout (In Port)"]:::port
            ICheckoutRepo["ICheckoutRepository (Out Port)"]:::port
            IAuth["IAuthProvider (Out Port)"]:::port
        end
    end

    subgraph Storage ["Session Storage Adapters"]
        Postgres["Postgres DB Adapter<br/>(Prisma - Active MVP)"]:::db
        Dynamo["DynamoDB Adapter<br/>(Swappable)"]:::db
        Mongo["MongoDB Adapter<br/>(Swappable)"]:::db
    end

    subgraph Identity ["Identity Providers (Swappable Adapters)"]
        JWT["Local JWT Provider<br/>(Bcrypt cost 12 / Active)"]:::ext
        Auth0["Auth0 Provider"]:::ext
        Cognito["AWS Cognito Provider"]:::ext
        Firebase["Firebase Auth Provider"]:::ext
    end

    %% Flow Arrows
    NextJS -->|HTTPS + JWT| CheckoutAPI
    ExternalClient -->|HTTPS + JWT| CheckoutAPI
    
    CheckoutAPI --> IProcess
    IProcess --> ICheckoutRepo
    IProcess --> IAuth
    
    ICheckoutRepo --> Postgres
    ICheckoutRepo -.-> Dynamo
    ICheckoutRepo -.-> Mongo
    
    IAuth --> JWT
    IAuth -.-> Auth0
    IAuth -.-> Cognito
    IAuth -.-> Firebase

    linkStyle 0,1 stroke:#8b5cf6,stroke-width:2px;
    linkStyle 2,3,4 stroke:#2563eb,stroke-width:2px;
    linkStyle 5 stroke:#10b981,stroke-width:2px;
    linkStyle 6,7 stroke:#9ca3af,stroke-width:1.5px,stroke-dasharray: 4;
    linkStyle 8 stroke:#f97316,stroke-width:2px;
    linkStyle 9,10,11 stroke:#9ca3af,stroke-width:1.5px,stroke-dasharray: 4;
```

### 3.1 End-to-End Connection Mechanics

The Frontend and External Adapters connect through a structured multi-layer pipeline:

```mermaid
graph TD
    Next["Frontend (Next.js)<br/>Port :3000"]:::client
    API["Checkout Service (NestJS)<br/>Port :4000"]:::service
    Inbound["1. Inbound Adapters<br/>(Controllers / Guards)"]:::service
    Application["2. Application Core<br/>(Use Cases / Ports)"]:::core
    Outbound["3. Outbound Adapters<br/>(Prisma / Bcrypt)"]:::service
    External["External Infra<br/>(PostgreSQL / OIDC)"]:::ext

    Next -->|HTTPS Requests + JWT| Inbound
    Inbound --> API
    API -->|DTOs via Ports| Application
    Application -->|Outbound Port calls| Outbound
    Outbound -->|SQL / API| External

    classDef client fill:#f5f3ff,stroke:#8b5cf6,stroke-width:2px,color:#4c1d95;
    classDef service fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;
    classDef core fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#064e3b;
    classDef ext fill:#fff7ed,stroke:#f97316,stroke-width:2px,color:#7c2d12;
```

1. **Frontend to Inbound HTTP Adapters**: Next.js client sends HTTPS requests to the controllers. Protected routes contain a `Bearer <token>` HTTP header.
2. **Inbound Adapters to Core Ports**: Controllers & Guards validate authentication (calling `validateToken` on the Auth Port) and then pass DTOs into the Application Core through inbound Port interfaces (`IProcessCheckout`).
3. **Core to Outbound Adapters**: The use case processes the business logic and calls outbound Ports (`ICheckoutRepository` / `IAuthProvider`) to save data or verify credentials.
4. **Outbound Adapters to External Infrastructure**: Active DB adapters query the database (e.g., Prisma querying PostgreSQL), and Auth adapters connect to local database tables or external OIDC providers.

---

## 4. Layer Structure

```
apps/api/src/
├── core/
│   ├── domain/
│   │   ├── checkout.ts              ← CheckoutItem, CheckoutSession, CheckoutResult
│   │   └── pricing.engine.ts        ← pure pricing functions
│   ├── ports/
│   │   ├── in/
│   │   │   └── checkout.usecase.port.ts    ← IProcessCheckout
│   │   └── out/
│   │       ├── checkout.repo.port.ts       ← ICheckoutRepository
│   │       └── auth.provider.port.ts       ← IAuthProvider
│   └── application/
│       └── process-checkout.usecase.ts
│
└── adapters/
    ├── in/http/
    │   ├── checkout.controller.ts
    │   ├── auth.controller.ts
    │   ├── health.controller.ts
    │   ├── checkout.dto.ts
    │   └── jwt-auth.guard.ts
    └── out/
        ├── db/
        │   ├── postgres/
        │   ├── dynamo/
        │   └── mongo/
        └── auth/
            ├── jwt/
            ├── auth0/
            ├── cognito/
            └── firebase/
```

---

## 5. Component Descriptions

### 5.1 Domain (`core/domain`)

Pure TypeScript — no imports, no side effects.

`pricing.engine.ts` exposes three pure functions:

```
calculateSubtotal(items)  → number
calculateTaxes(subtotal)  → number  [subtotal × 0.13]
calculateDiscount(subtotal) → number  [subtotal × 0.10 if subtotal > 100, else 0]
calculateTotal(subtotal, taxes, discount) → number
```

All values rounded to 2 decimal places via `Math.round(value * 100) / 100`.

### 5.2 Ports (`core/ports`)

Interfaces only — no implementation.

| Port | Direction | Consumer |
|------|-----------|---------|
| `IProcessCheckout` | Inbound | HTTP controller calls it |
| `ICheckoutRepository` | Outbound | Use case calls it |
| `IAuthProvider` | Outbound | Use case + Guard call it |

### 5.3 Use Case (`core/application`)

`ProcessCheckoutUseCase` implements `IProcessCheckout`:
1. Calls `pricing.engine.ts` to compute all fields.
2. Calls `ICheckoutRepository.save()` to persist the session.
3. Returns `CheckoutResult`.

It knows nothing about HTTP, databases, or auth tokens.

### 5.4 HTTP Adapter (`adapters/in/http`)

- `JwtAuthGuard` extracts the Bearer token and calls `IAuthProvider.validateToken()`. Attaches `{ userId }` to the request.
- `AuthController` calls `IAuthProvider.verifyCredentials()` and `issueToken()`.
- `CheckoutController` calls `IProcessCheckout.execute()` with the validated user ID and DTO items.
- Global `ValidationPipe` (`whitelist: true`) handles all input validation via class-validator decorators.
- Global exception filter normalizes errors — no stack traces to clients.

### 5.5 DB Adapters (`adapters/out/db`)

Each implements `ICheckoutRepository.save()`. Active adapter selected at startup:

```typescript
const DB_ADAPTER = { postgres, dynamo, mongo }[process.env.DB_PROVIDER ?? 'postgres'];
```

The Postgres adapter uses **Prisma** (`PrismaService` wraps `PrismaClient`). `items` stored as `JSONB`. Records are insert-only. Schema lives in `apps/api/prisma/schema.prisma`.

### 5.6 Auth Adapters (`adapters/out/auth`)

Each implements `IAuthProvider`. Active adapter selected at startup:

```typescript
const AUTH_ADAPTER = { jwt, auth0, cognito, firebase }[process.env.AUTH_PROVIDER ?? 'jwt'];
```

The JWT adapter stores users in PostgreSQL, hashes passwords with bcrypt (cost 12), and signs HS256 tokens. Other adapters validate tokens against external JWKS endpoints.

### 5.7 Frontend (`apps/web`)

Next.js App Router single application. Two routes:
- `/login` — calls `POST /auth/login`, stores token in React state (memory only).
- `/checkout` — protected; renders item form, calls `POST /checkout`, displays result.

---

## 6. Request Flow

### POST /checkout

```mermaid
sequenceDiagram
    autonumber
    actor Client as Next.js Client
    participant Guard as JwtAuthGuard
    participant Auth as IAuthProvider (JWT/Auth0)
    participant Ctrl as CheckoutController
    participant UC as ProcessCheckoutUseCase
    participant Engine as PricingEngine (Pure)
    participant Repo as ICheckoutRepository
    participant DB as PostgreSQL Database

    Client->>Guard: POST /checkout (Bearer <token>, items)
    activate Guard
    Guard->>Auth: validateToken(token)
    activate Auth
    Auth-->>Guard: Return user session { userId }
    deactivate Auth
    
    Guard->>Ctrl: Forward Request (with authenticated user)
    deactivate Guard
    activate Ctrl
    
    Ctrl->>UC: execute(userId, items)
    activate UC
    
    UC->>Engine: calculateSubtotal / Taxes / Discount / Total (items)
    activate Engine
    Engine-->>UC: Return computed pricing figures
    deactivate Engine
    
    UC->>Repo: save(sessionDetails)
    activate Repo
    Repo->>DB: INSERT INTO checkout_sessions (via Prisma)
    activate DB
    DB-->>Repo: Insert Success
    deactivate DB
    Repo-->>UC: Return CheckoutSession object
    deactivate Repo
    
    UC-->>Ctrl: Return CheckoutResult
    deactivate UC
    
    Ctrl-->>Client: 201 Created (subtotal, taxes, discount, total)
    deactivate Ctrl
```

---

## 7. Data Model

The database schema is declaratively defined via the Prisma Schema (`prisma/schema.prisma`). It consists of a single immutable table, as authentication and user records are delegated to pluggable identity systems (like Supabase Auth or mock providers).

### 7.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
model CheckoutSession {
  id         String   @id @default(uuid()) @db.Uuid
  user_id    String
  items      Json
  subtotal   Decimal  @db.Decimal(12, 2)
  taxes      Decimal  @db.Decimal(12, 2)
  discount   Decimal  @db.Decimal(12, 2)
  total      Decimal  @db.Decimal(12, 2)
  created_at DateTime @default(now()) @db.Timestamptz

  @@map("checkout_sessions")
}
```

### 7.2 SQL Database Schema

```sql
CREATE TABLE checkout_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    VARCHAR(255) NOT NULL, -- Managed by external Auth providers
  items      JSONB NOT NULL,        -- [{ name, unit_price, quantity }]
  subtotal   NUMERIC(12,2) NOT NULL,
  taxes      NUMERIC(12,2) NOT NULL,
  discount   NUMERIC(12,2) NOT NULL,
  total      NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

`checkout_sessions` is immutable — no UPDATE or DELETE.

---

## 8. Deployment View

### 8.1 General MVP & Multi-Cloud Deployment

The general multi-cloud target hosts the frontend on Vercel and the backend container on a microservice host:

```mermaid
graph TD
    classDef client fill:#fcfcfc,stroke:#000000,stroke-width:2px,color:#000000;
    classDef api fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;
    classDef db fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#064e3b;

    subgraph ClientHost ["Vercel Edge Cloud / Frontend"]
        NextJS["Next.js Web App<br/>(Client UI)<br/>Port :3000"]:::client
    end

    subgraph ServiceHost ["Railway / AWS ECS / GCP Cloud Run"]
        NestAPI["NestJS Checkout API<br/>(Stateless Docker Container)<br/>Port :4000"]:::api
    end

    subgraph DbHost ["Managed Database Layer"]
        Postgres["PostgreSQL Database<br/>(Supabase / RDS / Cloud SQL)"]:::db
    end

    NextJS -->|HTTPS API Requests / JWT| NestAPI
    NestAPI -->|Prisma Engine connection| Postgres

    linkStyle 0 stroke:#2563eb,stroke-width:2px;
    linkStyle 1 stroke:#10b981,stroke-width:2px;
```

### 8.2 GCP Production Deployment (Terraform)

When deploying to Google Cloud Platform, the configuration uses containerized services on **Google Cloud Run** for both layers, combined with **Supabase** for fully managed PostgreSQL data and Authentication:

```mermaid
graph TD
    classDef client fill:#fcfcfc,stroke:#000000,stroke-width:2px,color:#000000;
    classDef api fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;
    classDef db fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#064e3b;

    subgraph ClientHost ["Google Cloud Run (web)"]
        NextJS["Next.js Web App<br/>(Frontend UI)<br/>Port :3000"]:::client
    end

    subgraph ServiceHost ["Google Cloud Run (api)"]
        NestAPI["NestJS Checkout API<br/>(Backend Service)<br/>Port :4000"]:::api
    end

    subgraph DbHost ["Supabase Platform"]
        Postgres["PostgreSQL Database<br/>(Managed Sessions / Users)"]:::db
    end

    NextJS -->|HTTPS API Requests / JWT| NestAPI
    NestAPI -->|Prisma connection| Postgres

    linkStyle 0 stroke:#2563eb,stroke-width:2px;
    linkStyle 1 stroke:#10b981,stroke-width:2px;
```

All secrets are securely fetched from **Google Secret Manager** at startup. Switch targets by changing environment variables only — zero code changes required.

---

## 9. Key Architecture Decisions

| Decision | Choice | Alternative rejected |
|----------|--------|----------------------|
| Framework | NestJS | Fastify (no native DI) |
| Architecture | Hexagonal | Clean Architecture (weaker port isolation) |
| ORM | Prisma | TypeORM (removed: unsafe synchronize, decorator coupling) |
| Database | PostgreSQL + JSONB | MongoDB (unnecessary for MVP) |
| Auth | Swappable adapter | Hardcoded JWT |
| Frontend | Next.js single app | Webpack Module Federation MFE (too complex for MVP) |
| Monorepo | Turborepo | Separate repos (harder to share types) |

---

## 10. Extension Points

| Change | Impact |
|--------|--------|
| New pricing rule (regional tax, promo code) | Modify `pricing.engine.ts` only |
| New database | Add adapter in `adapters/out/db/`, set `DB_PROVIDER` |
| New auth provider | Add adapter in `adapters/out/auth/`, set `AUTH_PROVIDER` |
| New cloud target | New Dockerfile / infra config, zero app code changes |
| Extract to microservices | NestJS modules → independent services; ports define the contracts |
