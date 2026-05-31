# Checkout Service

Build a checkout service that exposes `POST /checkout` — accepts a list of items, returns subtotal, taxes, discount, and total. Requires authentication, a persistence layer, and must run in a distributed architecture. A Next.js UI is included as a bonus.

## Goal
Ship a working checkout service: correct pricing logic, JWT auth, PostgreSQL persistence, Docker-ready.

## Docs
- `docs/SAD-001` — architecture overview
- `docs/ADR-001` — decisions and rationale
- `docs/SRS-001` — requirements and acceptance criteria

## Agents
Specialized sub-agent definitions live in `agents/`. Each file owns a role — read the relevant one before starting work.

| Agent | Role |
|-------|------|
| `agents/backend-agent.md` | Full NestJS API |
| `agents/frontend-agent.md` | Next.js UI (bonus) |
| `agents/architecture-agent.md` | Docs + decisions |
| `agents/devops-agent.md` | Docker + CI + deploy |
| `agents/security-agent.md` | Auth + validation + secrets |

## Monorepo structure
```
apps/api/    ← NestJS backend
apps/web/    ← Next.js frontend (bonus)
```

## Rules
- TypeScript strict mode everywhere.
- `core/domain` and `core/application` — zero imports from NestJS, TypeORM, or any infrastructure library.
- Monetary arithmetic: `Math.round(value * 100) / 100` — never raw float accumulation.
- Secrets via env vars only. Never commit `.env` files.
- Run via `docker compose up` locally.

## Priority
Backend first. UI only after `POST /checkout`, auth, and persistence are working end-to-end.

## Orchestration rules

Before touching any file, identify which role it belongs to and read the corresponding agent file. Never work across multiple roles in a single task — delegate each role to its agent.

**File → agent mapping:**
- `apps/api/src/**` → read `agents/backend-agent.md`
- `apps/api/src/adapters/out/auth/**` or `apps/api/src/adapters/in/http/jwt-auth.guard.ts` → read `agents/security-agent.md` first, then `agents/backend-agent.md`
- `apps/web/**` → read `agents/frontend-agent.md`
- `Dockerfile`, `docker-compose.yml`, `.github/**` → read `agents/devops-agent.md`
- `docs/**`, `agents/**`, `CLAUDE.md` → read `agents/architecture-agent.md`

**When asked to build a feature end-to-end:**
1. Read `agents/architecture-agent.md` — confirm the decision is documented.
2. Read `agents/security-agent.md` — define auth and validation rules.
3. Read `agents/backend-agent.md` — implement the API.
4. Read `agents/devops-agent.md` — wrap and run.
5. Read `agents/frontend-agent.md` — bonus UI, only after API is verified.

**Never:**
- Import infrastructure into `core/domain` or `core/application`.
- Let two agents modify the same file.
- Skip reading the agent file before working on its files.
