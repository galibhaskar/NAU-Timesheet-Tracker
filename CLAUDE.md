# CLAUDE.md — NAU Timesheet Tracker

Project instructions, development strategy, and agent team protocol for Claude Code sessions.

---

## Project Overview

**NAU TA Timesheet Tracker** — A two-component system for Northern Arizona University:
- **Electron Desktop App** (TA-facing): Work clock timer, automatic screenshot capture, idle detection, photo upload for in-person work
- **Next.js Web Dashboard** (Instructor/Admin-facing): Review submissions with screenshot proof, approve/reject, budget management, audit logs

**Design Spec**: [`docs/02-architecture/design-spec.md`](docs/02-architecture/design-spec.md)
**GitHub Repo**: `galibhaskar/NAU-Timesheet-Tracker`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web App | Next.js 14 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui |
| Desktop App | Electron + React |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Auth (web) | NextAuth.js (Credentials provider) |
| Auth (desktop) | JWT + refresh token stored in `safeStorage` |
| Storage | S3-compatible (AWS S3 or Cloudflare R2; MinIO for local dev) |
| Monorepo | npm workspaces + Turborepo |
| Shared Types | `packages/shared` (`@nau/shared`) |

---

## Repository Structure

```
nau-timesheet-tracker/
├── apps/
│   ├── web/                        # Next.js 14 web app + API
│   │   ├── app/                    # App Router pages and API routes
│   │   ├── components/             # React components
│   │   ├── lib/                    # Services, middleware, validators
│   │   └── prisma/                 # Schema, migrations, seed
│   └── desktop/                    # Electron app (Phase 3)
├── packages/
│   └── shared/                     # Shared TypeScript types and enums
├── docs/
│   ├── 01-requirements/            # User stories, edge cases, validation rules (BA Agent)
│   ├── 02-architecture/            # Design spec, auth architecture (Security Agent)
│   ├── 03-design/                  # Design tokens, components, wireframes (UI/UX Agent)
│   │   └── wireframes/
│   ├── 04-development/             # API docs, dev guides (Dev + Docs Agent)
│   ├── 05-testing/                 # Test strategy, test plans (QA Agent)
│   ├── 06-deployment/              # Deployment runbooks (Deployment Agent)
│   └── 07-project-management/      # Team work log, sprint boards
├── .github/workflows/              # CI/CD pipelines
├── docker-compose.dev.yml          # Local dev: PostgreSQL + MinIO
└── CLAUDE.md                       # This file
```

---

## Agent Team

This project is built by a team of 8 specialized agents, each with a defined role and scope. The **Project Manager (user)** reviews and approves phase completions before proceeding.

| Agent | Role | Active Phases |
|-------|------|--------------|
| **Business Analyst** | Requirements, user stories, edge cases, validation rules, state machines | 0, 1, 6 |
| **UI/UX** | Design system, component specs, wireframes, accessibility | 0, 2, 4 |
| **Development** | All implementation: API, frontend, Electron, cron jobs | 0–4 |
| **Quality Analyst** | Test strategy, unit/integration/E2E tests, coverage | 1–3, 5 |
| **Code Refactoring** | Service extraction, query optimization, TypeScript strictness | 4, 5 |
| **Deployment** | CI/CD, Docker, Vercel, GitHub Releases, environments | 0, 6 |
| **Documentation** | API docs, user guides, developer setup, runbooks | 6 |
| **Security** | Auth hardening, RBAC, input validation, OWASP audit, Electron security | 0–3, 5 |

---

## Model Assignment Strategy

Assign Claude models based on task complexity:

### Opus (`claude-opus-4-6`) — Planning & Deep Thinking
Use for:
- Writing implementation plans (multi-phase, cross-agent dependencies)
- Architecture decisions and trade-off analysis
- Complex debugging that requires reasoning through system behavior
- Reviewing completed phases as Project Manager
- Any task requiring 500+ lines of nuanced decision-making

### Sonnet (`claude-sonnet-4-6`) — Execution (Medium Complexity)
Use for:
- Implementing API endpoints and business logic
- Writing comprehensive test suites
- Building React dashboard pages and complex components
- Security audits and RBAC implementation
- Refactoring service layers
- Writing documentation with code examples

### Haiku (`claude-haiku-4-5`) — Simple Tasks
Use for:
- Creating placeholder files and stubs
- Renaming or moving files
- Simple config file creation
- README updates
- Adding `.gitkeep` markers
- Quick type definition additions

### How to specify model in Agent dispatch:
```
Agent tool → model: "opus" | "sonnet" | "haiku"
```

---

## Development Workflow

### Phase Lifecycle
```
1. PM reviews phase plan → approves
2. Agents dispatched (parallel where independent)
3. Each agent: read spec → implement → verify → return result
4. Claude presents a DETAILED DEMO to PM:
   - Show all files created/modified with key code sections
   - Walk through the feature end-to-end (API calls, UI flows, data models)
   - Highlight design decisions, trade-offs, and anything non-obvious
   - List any known gaps or deferred items
5. PM reviews demo → requests changes OR approves
6. If changes requested: implement feedback → re-demo → wait for approval
7. ONLY after explicit PM approval: commit + push to galibhaskar/NAU-Timesheet-Tracker
```

> **RULE: Never commit or push code without explicit PM approval.**
> Always say "Awaiting your approval before committing." at the end of each demo.

### Agent Dispatch Rules
- **Parallel**: Agents working on non-overlapping files can run simultaneously
- **Sequential**: An agent that depends on another's output must wait
- **Worktree**: Use `isolation: "worktree"` for large code changes that may conflict
- **Background**: Use `run_in_background: true` for all parallel agents; foreground only when you need results before proceeding

### Git Strategy
- **Never commit or push without PM approval** — demo first, commit after approval
- Commit after every phase (or major sub-phase) completion, once PM approves
- Use descriptive commit messages referencing the agent and phase:
  ```
  Phase 1: Development Agent — session API endpoints with server-authoritative timing
  ```
- Push to `origin/main` after each phase. Always push workflow files only after `workflow` scope is granted (`gh auth refresh -s workflow`)
- Never force push to main

### Demo Format
When presenting a phase demo to PM, structure it as:
1. **Summary** — What was built, which agents completed work
2. **File Tree** — All new/modified files with one-line descriptions
3. **Walkthrough** — Key code sections explained (not just file dumps)
4. **End-to-End Flow** — How a user request flows through the system
5. **Design Decisions** — Non-obvious choices made and why
6. **Known Gaps / Next Steps** — What is deferred to a later phase
7. **Awaiting your approval before committing.**

### Team Work Log
The file [`docs/07-project-management/team-work-log.md`](docs/07-project-management/team-work-log.md) is **append-only**. Rules:
- Update agent status when dispatched: `⬜ BACKLOG → 🟡 IN PROGRESS`
- Update when complete: `🟡 IN PROGRESS → ✅ COMPLETED`
- Append timestamped log entries — never delete past entries
- Update sprint board and metrics dashboard after each phase

---

## Implementation Phases

| Phase | Sprint | Focus | Entry Criteria | Exit Criteria |
|-------|--------|-------|----------------|---------------|
| **0** | 1 | Foundation | Design spec finalized | Repo scaffolded, DB migrations ready, CI green |
| **1** | 2 | Core Backend | Phase 0 complete | All 15 API endpoints functional, auth working |
| **2** | 3 | Web Dashboard | API endpoints tested | All 3 dashboards rendering with real data |
| **3** | 3–4 | Electron App | Session API tested | Desktop builds for macOS + Windows |
| **4** | 5 | Integration & Polish | Web + Desktop functional | Full E2E workflow working |
| **5** | 6 | Testing & Security | Features integrated | 80%+ coverage, security audit clean |
| **6** | 7 | Deployment & Docs | Tests passing | Production live, docs complete |

---

## Code Standards

### TypeScript
- **Strict mode on** — `"strict": true` in all tsconfig.json files
- **Zero `any`** in production code — use `unknown` + type guards instead
- Prefer interfaces over type aliases for object shapes
- Export types from `packages/shared` for cross-package use

### API Design
- All API routes return `{ data, error }` or `NextResponse.json()`
- Error format: `{ error: string, code: string, details?: unknown }`
- HTTP status codes strictly followed: 200, 201, 400, 401, 403, 404, 409, 422, 500
- Every endpoint validates input with Zod schemas in `lib/validators/`

### Database (Prisma)
- **All timestamps in UTC** in the database; convert to `America/Phoenix` at display layer only
- Use `Decimal` (not `Float`) for all hour/money fields: `@db.Decimal(6,2)`
- snake_case table and column names via `@map` and `@@map`
- Avoid raw SQL except for the partial unique index (active session constraint)
- `weekly_hour_budget` is always computed in the service layer — never stored as a DB column

### Security (Non-Negotiable)
- Never expose direct S3/R2 URLs — always generate presigned URLs (15-min expiry)
- Screenshot/photo access gated by chain: `Screenshot → WorkSession → CourseAssignment → Course`
- TAs always get 403 on proof endpoints — no exceptions
- Rate limit login: 5 attempts per 15 min per email
- Zod validation on every API endpoint input
- Electron: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`

### Naming Conventions
- Files: `kebab-case.ts`
- React components: `PascalCase.tsx`
- Functions/variables: `camelCase`
- Database columns: `snake_case` (via Prisma `@map`)
- Env vars: `SCREAMING_SNAKE_CASE`

---

## Key Design Decisions

1. **Server-authoritative timing** — `active_minutes` is always recomputed from the `SessionEvent` append-only log. Client timestamps are recorded but never trusted.
2. **Single active session** — Enforced via PostgreSQL partial unique index on `work_sessions(assignment_id) WHERE status = 'ACTIVE'`. The API returns HTTP 409 with the active session ID.
3. **TAs cannot view screenshots** — Screenshots exist solely for instructor/admin review. This prevents TAs from knowing exactly when captures happen.
4. **America/Phoenix timezone** — NAU is in Arizona (UTC-7 year-round, no DST). All week boundaries and display logic use this timezone. Use `date-fns-tz` for conversion.
5. **Budget as virtual field** — `weekly_hour_budget = enrolled_students × hours_per_student` computed at query time. Admin can override with `override_weekly_budget` (nullable).

---

## Local Development Setup

```bash
# 1. Start database and storage
docker compose -f docker-compose.dev.yml up -d

# 2. Copy env vars
cp .env.example .env.local

# 3. Install dependencies
npm install

# 4. Run migrations + seed
npm run db:migrate
npm run db:seed

# 5. Start web app
npm run dev
```

**Default seed accounts** (password: `password123`):
- Admin: `admin@nau.edu`
- Instructor: `instructor1@nau.edu`, `instructor2@nau.edu`
- TAs: `ta1@nau.edu` through `ta4@nau.edu`

---

## Anti-Patterns to Avoid

- ❌ Don't compute `active_minutes` on the client — always recompute server-side from events
- ❌ Don't return direct S3 URLs in API responses — always presign
- ❌ Don't store secrets in code — use env vars
- ❌ Don't skip Zod validation on any endpoint, even internal ones
- ❌ Don't use `any` type in TypeScript
- ❌ Don't store hours as `Float` — use `Decimal` for precision
- ❌ Don't bypass the partial unique index for active sessions — enforce at DB level
- ❌ Don't let TAs access proof files — even in development/testing
