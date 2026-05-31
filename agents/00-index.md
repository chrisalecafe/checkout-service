# Checkout Service — Agent Index

## Agents

| Agent | Role | Owns |
|-------|------|------|
| `backend-agent.md` | Full NestJS API | `apps/api/src/**` |
| `frontend-agent.md` | Next.js UI (bonus) | `apps/web/**` |
| `architecture-agent.md` | Docs + decisions | `docs/`, `agents/`, `CLAUDE.md` |
| `devops-agent.md` | Docker + CI + deploy | Dockerfiles, Compose, workflows |
| `security-agent.md` | Auth + validation + secrets | JWT adapter, guard, password policy |

## Dependency order

```
[architecture]  ←  defines contracts and decisions first
      ↓
[security]      ←  defines auth and validation rules
      ↓
[backend]       ←  implements API following security spec
      ↓
[devops]        ←  wraps and runs the built API
      ↓
[frontend]      ←  bonus UI, only after API is verified working
```

## How agents work

Each file is a **self-contained system prompt** in first person. It works the same regardless of how it is invoked:

**Claude Code** — `CLAUDE.md` at the repo root maps every file path to the right agent automatically. No manual selection needed.

**Terminal** — `claude --system-prompt "$(cat agents/backend-agent.md)"`

**New conversation** — paste the file contents, then give the task.

## Shared rules (all agents)

- TypeScript strict mode everywhere.
- Monetary arithmetic: `Math.round(value * 100) / 100`.
- Secrets via env vars only — never in source or version control.
- No agent modifies files owned by another agent.
