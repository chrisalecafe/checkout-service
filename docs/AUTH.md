# Authentication

## Overview

The API uses **JWT Bearer tokens** for authentication. Every request to a protected endpoint must include a valid token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are issued by `POST /auth/login` and expire after **3600 seconds (1 hour)**. The frontend automatically refreshes them before they expire.

---

## Auth providers

The active provider is selected at runtime via the `AUTH_PROVIDER` environment variable. All providers implement the same `IAuthProvider` port — no application code changes when switching.

| `AUTH_PROVIDER` | Description | When to use |
|---|---|---|
| `mock` | In-memory users, no database | Local dev without Postgres |
| `jwt` | Self-managed users in Postgres, bcrypt + HS256 | Self-hosted production |
| `supabase` | Supabase Auth (GoTrue), JWKS-style validation | Managed production |

---

## Auth flows

### Register

```
POST /auth/register
Content-Type: application/json

{ "email": "user@example.com", "password": "password123" }
```

```json
// 201
{ "userId": "uuid" }
```

- Password is hashed with bcrypt (cost 12) before storage.
- Returns `409` if the email is already registered.

---

### Login

```
POST /auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "password123" }
```

```json
// 200
{ "access_token": "eyJ...", "expires_in": 3600 }
```

- `expires_in` is always 3600 (seconds).
- The frontend stores `access_token` in `localStorage` and schedules a refresh at `expires_in - 60` seconds.

---

### Token refresh

```
POST /auth/refresh
Authorization: Bearer <current_access_token>
```

```json
// 200
{ "access_token": "eyJ...", "expires_in": 3600 }
```

- Issues a new token for the authenticated user without requiring credentials again.
- The old token remains valid until its own expiry — there is no token revocation.
- The frontend calls this automatically; you rarely need to call it manually.

---

### Protected request

```
POST /checkout
Authorization: Bearer <access_token>
Content-Type: application/json

{ "items": [...] }
```

- The `JwtAuthGuard` extracts the Bearer token, calls `IAuthProvider.validateToken()`, and attaches `{ userId }` to the request.
- Returns `401` if the token is missing, malformed, or expired.

---

## Provider details

### `jwt` provider

- Users stored in the `users` table (Postgres).
- Tokens signed with `JWT_SECRET` (HS256). Must be ≥ 32 characters; the app exits on startup if unset.
- Token validation is **local** — no network call per request.

### `supabase` provider

- Users managed by Supabase Auth (GoTrue).
- `register` → `supabase.auth.admin.createUser()` with `email_confirm: true`.
- `login` → `supabase.auth.signInWithPassword()` — Supabase issues the token.
- Token validation is **local** using `SUPABASE_JWT_SECRET` — no Supabase API call per request.
- Required env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role)
  - `SUPABASE_JWT_SECRET` (Settings → API → JWT Secret)

### `mock` provider

- In-memory user store seeded with two accounts:
  - `dev@example.com` / `password123`
  - `alice@example.com` / `password123`
- Tokens signed with `JWT_SECRET` (falls back to `mock-secret` if unset).
- State is lost on process restart.

---

## Rate limiting

Auth endpoints are subject to stricter throttling than the rest of the API:

| Scope | Limit |
|---|---|
| Global (all routes) | 60 requests / minute / IP |
| Auth routes (`/auth/*`) | 10 requests / minute / IP |

Exceeding the limit returns `429 Too Many Requests`.

---

## Security notes

- `JWT_SECRET` must be ≥ 32 characters. The process exits on startup if it is missing or too short.
- `SHELL_ORIGIN` must be set in production. The process throws on startup if it is unset and `NODE_ENV=production`.
- Swagger UI (`/api/docs`) is disabled in production (`NODE_ENV=production`).
- All responses use HTTP security headers provided by `helmet`.
- Request bodies are capped at 10 KB to prevent payload-based DoS.
