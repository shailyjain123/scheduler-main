# Backend — Rails 8 API

Rails 8 API-only application. Serves as the **single source of truth** for all data models, authentication, and business logic consumed by the web and mobile clients.

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Ruby on Rails (API-only) | 8.1 |
| Language | Ruby | 3.3.9 |
| Database | PostgreSQL | 16+ |
| Auth | JWT + bcrypt + OmniAuth 2.x | — |
| Background Jobs | Solid Queue | built-in |
| Cache | Solid Cache | built-in |
| Real-time | Action Cable (Solid Cable in production) | built-in |
| Email | Action Mailer + SMTP | built-in |
| Testing | RSpec + FactoryBot + Faker | 6.x |

---

## Prerequisites

- Ruby `3.3.9` — use [rbenv](https://github.com/rbenv/rbenv) or [asdf](https://asdf-vm.com/)
- PostgreSQL `16+` running locally
- Bundler `2.x` (`gem install bundler`)

---

## Setup

### 1. Install Ruby dependencies

```bash
cd backend
bundle install
```

### 2. Configure environment variables

```bash
cp .env.example .env   # or create .env manually
```

Edit `.env` with your local values (see [Environment Variables](#environment-variables) below).

### 3. Set up the database

```bash
bin/rails db:create
bin/rails db:migrate
bin/rails db:seed        # optional: load seed data
```

### 4. Start the development server

```bash
bin/rails server         # runs on http://localhost:3000
```

Background jobs (Solid Queue) run **inside the Puma process** in development — no separate worker needed (`SOLID_QUEUE_IN_PUMA=1`).

---

## Environment Variables

Create `backend/.env` (never commit secrets):

```env
# Database
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost

# Rails secrets
SECRET_KEY_BASE=<generate with: rails secret>
ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY=<32 chars>
ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY=<32 chars>
ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT=<32 chars>

# URLs
FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:3000

# OAuth providers (at minimum configure Google for login to work)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=

# SMTP (for OTP and notification emails)
MAILER_FROM_EMAIL=noreply@example.com
SMTP_ADDRESS=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_ENABLE_STARTTLS_AUTO=true

# Email validation (optional — premium feature)
VERIFALIA_USERNAME=
VERIFALIA_PASSWORD=

# Turnstile bot protection (optional)
TURNSTILE_SECRET_KEY=

# Runtime tuning (defaults work for local dev)
RAILS_MAX_THREADS=5
RAILS_LOG_LEVEL=debug
PORT=3000
SOLID_QUEUE_IN_PUMA=1
```

---

## Database Commands

```bash
# Create databases
bin/rails db:create

# Run all pending migrations
bin/rails db:migrate

# Roll back the last migration
bin/rails db:rollback

# Reset (drop → create → migrate → seed)
bin/rails db:reset

# Load seed data only
bin/rails db:seed

# Open Rails console
bin/rails console

# Check migration status
bin/rails db:migrate:status
```

### Creating a migration

```bash
bin/rails generate migration AddColumnToTable column:type
bin/rails db:migrate
```

> ⚠️ Never edit `db/schema.rb` directly. Always generate and run migrations.

---

## Background Jobs (Solid Queue)

In development, Solid Queue runs inside Puma automatically when `SOLID_QUEUE_IN_PUMA=1`.

In production, run a dedicated worker:

```bash
bin/jobs start
```

---

## Action Cable

Action Cable is mounted at `/cable`. Adapter configuration:

- **Development**: `async` (in-process, no external dependency)
- **Production**: `solid_cable` (database-backed)

No additional setup needed for local development.

---

## Testing

```bash
# Run the full test suite
bundle exec rspec

# Run a specific spec file
bundle exec rspec spec/path/to/spec.rb

# Run with test coverage report
COVERAGE=true bundle exec rspec
```

---

## Linting & Security

```bash
# RuboCop (style)
bundle exec rubocop

# RuboCop with auto-fix
bundle exec rubocop -a

# Brakeman (security scanner)
bundle exec brakeman

# Bundler Audit (dependency CVEs)
bundle exec bundler-audit check --update
```

---

## API Overview

All routes are prefixed with `/api/v1/`. Base URL: `http://localhost:3000`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/signup` | Register new user |
| POST | `/api/v1/auth/verify-otp` | Verify OTP code |
| POST | `/api/v1/auth/forgot-password` | Send reset email |
| POST | `/api/v1/auth/reset-password` | Reset with token |
| POST | `/api/v1/auth/logout` | Invalidate session |
| GET | `/api/v1/auth/:provider/authorize` | Start OAuth flow |

### Resources (authenticated)
| Resource | Path |
|----------|------|
| Current user | `GET /api/v1/users/me` |
| Events | `/api/v1/events` |
| Event Types | `/api/v1/event_types` |
| Contacts | `/api/v1/contacts` |
| Availability | `/api/v1/availability/schedules` |
| Integrations | `/api/v1/integrations` |
| Settings | `/api/v1/settings` |
| Notifications | `/api/v1/notifications` |

### Public (no auth)
| Path | Description |
|------|-------------|
| `GET /api/v1/public/event_types/:id` | Public booking page data |
| `POST /api/v1/public/event_types/:id/bookings` | Create a booking |
| `GET /api/v1/public/bookings/manage/:token` | Booking management |
| `POST /api/v1/public/bookings/manage/:token/cancel` | Cancel booking |
| `POST /api/v1/public/bookings/manage/:token/reschedule` | Reschedule booking |

### Health check
```
GET /up
```

---

## Directory Structure

```
backend/
├── app/
│   ├── controllers/api/v1/   # Request handlers (no business logic)
│   ├── models/               # ActiveRecord models
│   ├── serializers/          # JSON serializers
│   ├── services/             # Business logic (service objects)
│   ├── mailers/              # Action Mailer email classes
│   └── jobs/                 # Solid Queue background jobs
├── config/
│   ├── routes.rb             # All API routes
│   ├── initializers/cors.rb  # CORS config (credentials: true)
│   └── initializers/omniauth.rb  # OAuth provider setup
├── db/
│   ├── schema.rb             # Auto-generated schema (do not edit)
│   ├── migrate/              # Migration files
│   └── seeds.rb              # Seed data
└── spec/                     # RSpec tests
```

---

## Troubleshooting

### `PG::ConnectionBad` — Cannot connect to PostgreSQL
Ensure PostgreSQL is running:
```bash
brew services start postgresql@16   # macOS
sudo service postgresql start       # Linux
```
Check `DB_HOST`, `DB_USER`, `DB_PASSWORD` in your `.env`.

### `ActiveRecord::NoDatabaseError`
Run `bin/rails db:create db:migrate`.

### `LoadError: cannot load such file` after `bundle install`
Try:
```bash
bundle exec spring stop
bundle install
```

### OAuth callback errors
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- Ensure `FRONTEND_URL=http://localhost:3001` matches the registered redirect URI in Google/Microsoft consoles.
- `httponly: false` on the token cookie is required — do not change it.

### CORS errors from frontend
Ensure `FRONTEND_URL=http://localhost:3001` is set in `.env` and the Rails server was restarted after the change.

### Emails not sending in development
Set `RAILS_LOG_LEVEL=debug` and check `log/development.log`. In development, emails are logged by default — set SMTP credentials only if you need real delivery.
