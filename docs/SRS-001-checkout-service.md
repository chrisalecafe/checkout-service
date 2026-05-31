# SRS-001: Simple Checkout Service

| Field       | Detail    |
|-------------|-----------|
| **Version** | 1.1.0     |
| **Status**  | Approved  |
| **Date**    | 2026-05-30 |

---

## 1. Scope

The service exposes `POST /checkout`, calculates subtotal/taxes/discount/total, requires authentication, and persists results. UI is a bonus, not a requirement.

Out of scope: payment processing, inventory, shipping, order management.

---

## 2. Functional Requirements

### Authentication

**FR-AUTH-01** — `POST /auth/login` accepts `{ email, password }`, returns `{ access_token, expires_in }` or 401.

**FR-AUTH-02** — `POST /checkout` requires `Authorization: Bearer <token>`. Invalid/missing → 401.

**FR-AUTH-03** — Auth provider selectable via `AUTH_PROVIDER` env var (`jwt` | `auth0` | `cognito` | `firebase`). No code changes required to switch.

### Checkout

**FR-CHECKOUT-01** — `POST /checkout` is protected by JWT.

**FR-CHECKOUT-02** — Request body: `{ items: [{ name: string, unit_price: number, quantity: integer }] }`. Items array must be non-empty; name non-empty max 200 chars; unit_price > 0; quantity ≥ 1.

**FR-CHECKOUT-03/04/05/06** — Calculations:
```
subtotal = Σ (unit_price × quantity)
taxes    = round(subtotal × 0.13, 2)
discount = subtotal > 100 ? round(subtotal × 0.10, 2) : 0
total    = round(subtotal + taxes − discount, 2)
```

**FR-CHECKOUT-07** — Response 201: `{ subtotal, taxes, discount, total }`.

### Persistence

**FR-PERSIST-01** — Every successful checkout is saved: user_id, items, subtotal, taxes, discount, total.

**FR-PERSIST-02** — Records are immutable (no update/delete).

**FR-PERSIST-03** — `created_at` timestamp set at insertion.

**FR-PERSIST-04** — DB provider selectable via `DB_PROVIDER` env var (`postgres` | `dynamo` | `mongo`).

### Health

**FR-HEALTH-01** — `GET /health` returns 200 `{ status: "ok", timestamp }` when healthy, 503 if DB unreachable.

### UI (Bonus)

**FR-UI-01** — Next.js app with login page and checkout form.

**FR-UI-02** — Checkout form: add/remove item rows, disable submit while in flight, display API result on success, show error on failure.

**FR-UI-03** — Token stored in React state (memory only).

---

## 3. Non-Functional Requirements

**NFR-EXT-01** — New business rules (tax rate, discount rules) require changes only to `pricing.engine.ts`.

**NFR-EXT-02** — Swapping DB or auth provider requires only a new adapter + env var change.

**NFR-REL-01** — 400 with descriptive message for invalid input.

**NFR-REL-02** — 500 on DB failure; no internal details exposed to client.

**NFR-PERF-01** — p95 < 300ms at 50 concurrent requests with DB RTT ≤ 20ms.

**NFR-PERF-02** — Stateless service; horizontally scalable.

**NFR-SEC-01** — All endpoints except `/health` and `/auth/login` require JWT.

**NFR-SEC-02** — Passwords hashed with bcrypt, cost 12.

**NFR-SEC-03** — Secrets via env vars only; never in source or version control.

**NFR-SEC-04** — No stack traces in API responses.

**NFR-MAIN-01** — `core/domain` and `core/application` have zero imports from NestJS, TypeORM, or HTTP/DB libraries.

**NFR-MAIN-02** — 100% unit test coverage on `pricing.engine.ts`.

**NFR-PORT-01** — Packaged as Docker image; deployable to Railway, AWS ECS, or GCP Cloud Run via env var changes only.

---

## 4. Architecture

Hexagonal (Ports & Adapters) with NestJS. See ADR-001.

```
src/
├── core/
│   ├── domain/checkout.ts
│   ├── domain/pricing.engine.ts
│   ├── ports/in/checkout.usecase.port.ts
│   ├── ports/out/checkout.repo.port.ts
│   ├── ports/out/auth.provider.port.ts
│   └── application/process-checkout.usecase.ts
└── adapters/
    ├── in/http/  (controller, DTOs, guard)
    └── out/      (db adapters, auth adapters)
```

---

## 5. Data

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  items JSONB NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  taxes NUMERIC(12,2) NOT NULL,
  discount NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. API

### POST /auth/login
```json
// request
{ "email": "user@example.com", "password": "secret" }

// 200
{ "access_token": "eyJ...", "expires_in": 3600 }
```

### POST /checkout
```json
// request
{ "items": [{ "name": "Widget A", "unit_price": 49.99, "quantity": 2 }] }

// 201
{ "subtotal": 109.97, "taxes": 14.30, "discount": 11.00, "total": 113.27 }
```

### GET /health
```json
// 200
{ "status": "ok", "timestamp": "2026-05-30T00:00:00.000Z" }
```

---

## 7. Acceptance Criteria

| ID | Scenario | subtotal | taxes | discount | total |
|----|----------|----------|-------|----------|-------|
| AC-01 | Below threshold | 50.00 | 6.50 | 0.00 | 56.50 |
| AC-02 | At threshold | 100.00 | 13.00 | 0.00 | 113.00 |
| AC-03 | Above threshold | 109.97 | 14.30 | 11.00 | 113.27 |

| ID | Scenario | Response |
|----|----------|----------|
| AC-06 | Empty items | 400 |
| AC-07 | Missing name | 400 |
| AC-08 | unit_price = 0 | 400 |
| AC-09 | quantity = 0 | 400 |
| AC-10 | Negative unit_price | 400 |
| AC-11 | No Authorization header | 401 |
| AC-12 | Expired JWT | 401 |
| AC-13 | Tampered JWT | 401 |
| AC-14 | Valid JWT | 201 |
| AC-15 | Successful checkout | Record written to DB |
| AC-16 | Failed validation | No record written |
| AC-17 | DB unreachable | 500 |
