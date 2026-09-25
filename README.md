# Scheduler

A full-stack scheduling platform built as a monorepo with three independent submodules.

| Module | Technology | Port |
|--------|-----------|------|
| `backend/` | Rails 8 API-only | `3000` |
| `web/` | Next.js 16 | `3001` |
| `mobile/` | React Native + Expo 54 | — |

---

## Prerequisites

| Tool | Version |
|------|---------|
| Ruby | 3.3.9 (see `backend/.ruby-version`) |
| Node.js | 20.x LTS (see `web/.nvmrc`) |
| PostgreSQL | 16+ |
| Bundler | 2.x |
| npm | 10+ |
| Expo CLI | latest |

---

## Repository Structure

```
scheduler/
├── backend/        → Rails 8 API (source of truth for all data & auth)
├── web/            → Next.js 16 browser client
├── mobile/         → React Native / Expo 54 mobile client
├── start.sh        → Unified dev launcher
├── AGENTS.md       → AI agent rules (read before coding)
└── docs/
    └── archive/    → Outdated/historical notes
```

Each subdirectory is an independent Git submodule with its own dependencies, `.env`, and README.

---

## Module READMEs

- **[backend/README.md](backend/README.md)** — Rails setup, DB, migrations, environment variables
- **[web/README.md](web/README.md)** — Next.js setup, environment variables, dev/build commands
- **[mobile/README.md](mobile/README.md)** — Expo setup, environment variables, running on iOS/Android

---

## Git Submodules

```bash
# Pull latest for all submodules
cd backend && git pull && cd ..
cd web && git pull && cd ..
cd mobile && git pull && cd ..
```

---

## Environment Variables

Each module has its own `.env` file. **Never commit secrets.**

| File | Purpose |
|------|---------|
| `backend/.env` | Rails secrets, DB, OAuth credentials, SMTP |
| `web/.env.local` | Next.js public/private env vars |
| `mobile/.env` | Expo public env vars |

---

## Architecture Notes

- The **backend** is the single source of truth for all APIs and data models.
- The **web** and **mobile** clients consume the backend REST API.
- Authentication uses JWT tokens + HTTP-only-safe cookies (see `AGENTS.md` for critical details).
- UI designs are managed via **Google Stitch MCP** — do not modify designs ad-hoc.

For AI agent coding rules, see [`AGENTS.md`](AGENTS.md).
