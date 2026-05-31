# Checkout Service

A stateless NestJS microservice that calculates checkout totals, persists sessions, and authenticates requests via JWT. Includes a bonus Next.js UI. Deployable to Railway, AWS ECS, or GCP Cloud Run by changing environment variables only.

## Architecture

Hexagonal (Ports & Adapters). The business core has zero dependencies on any framework or infrastructure library.

```
domain ← application ← adapters ← framework / infra
```

- `core/domain` — pure entities and pricing functions
- `core/ports` — interface contracts (no implementation)
- `core/application` — use cases; orchestrates domain + ports
- `adapters/in/http` — controllers, guards, DTOs
- `adapters/out/db` — PostgreSQL / DynamoDB / MongoDB
- `adapters/out/auth` — JWT / Auth0 / Cognito / Firebase

## API

### POST /auth/login
```json
// request
{ "email": "user@example.com", "password": "secret" }

// 200
{ "access_token": "eyJ...", "expires_in": 3600 }
```

### POST /checkout
Requires `Authorization: Bearer <token>`.

```json
// request
{ "items": [{ "name": "Widget A", "unit_price": 49.99, "quantity": 2 }] }

// 201
{ "subtotal": 99.98, "taxes": 13.00, "discount": 0.00, "total": 112.98 }
```

Pricing rules:
- `subtotal` = Σ (unit_price × quantity)
- `taxes` = subtotal × 0.13
- `discount` = subtotal > 100 → subtotal × 0.10, else 0
- `total` = subtotal + taxes − discount

### GET /health
```json
// 200
{ "status": "ok", "timestamp": "2026-05-30T00:00:00.000Z" }
```

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) (for local development)

### Run with Docker

```bash
cp apps/api/.env.example apps/api/.env   # fill in secrets
docker compose up
```

API is available at `http://localhost:4000`.  
Web UI is available at `http://localhost:3000`.

### Run Locally

```bash
pnpm install
pnpm turbo dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | HS256 signing secret |
| `DB_PROVIDER` | `postgres` | `postgres` \| `dynamo` \| `mongo` |
| `AUTH_PROVIDER` | `jwt` | `jwt` \| `auth0` \| `cognito` \| `firebase` |
| `PORT` | `4000` | API listen port |

Never commit `.env` files. Secrets are injected at runtime only.

## Project Structure

```
apps/
  api/           NestJS backend
    src/
      core/
        domain/         Entities + pricing engine (zero deps)
        ports/          Interface contracts
        application/    Use cases
      adapters/
        in/http/        Controllers, guards, DTOs
        out/db/         Database adapters
        out/auth/       Auth adapters
    prisma/             Schema + migrations
  web/           Next.js frontend (bonus)
agents/          Sub-agent role definitions
docs/            Architecture and requirements docs
```

## Docs

| Document | Purpose |
|----------|---------|
| [docs/SAD-001](docs/SAD-001-checkout-service.md) | Software Architecture Document |
| [docs/ADR-001](docs/ADR-001-checkout-service.md) | Architecture Decision Records |
| [docs/SRS-001](docs/SRS-001-checkout-service.md) | Requirements and acceptance criteria |

## Testing

```bash
pnpm turbo test
```

`pricing.engine.ts` has 100% unit test coverage. Integration tests hit a real database — no mocks.
