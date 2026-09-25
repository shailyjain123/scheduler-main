# 🏗 BACKEND — Rails 8 API-Only Application

> **Read `scheduler/AGENTS.md` (root) FIRST.**
> **This document covers backend-specific rules, patterns, and schemas.**
> **DO NOT modify the rules, patterns, or architecture defined below without explicit user approval.**

---

## 📊 TECH STACK

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Ruby on Rails (API-only mode) | 8.1 |
| Language | Ruby | 3.3.9 |
| Database | PostgreSQL | 16+ |
| Auth | JWT + bcrypt + OmniAuth 2.x |  |
| Background Jobs | Solid Queue | built-in |
| Cache | Solid Cache | built-in |
| Email | Action Mailer | built-in |
| Testing | RSpec + FactoryBot + Faker | 6.x |
| CORS | rack-cors | latest |
| OAuth | OmniAuth (Google, Microsoft, Slack, Zoom) | 2.x |

---

## 📂 DIRECTORY STRUCTURE

```
backend/
├── app/
│   ├── controllers/
│   │   ├── application_controller.rb          # Global error handlers
│   │   └── api/
│   │       ├── base_controller.rb             # JWT auth, token extraction, 401 responses
│   │       └── v1/
│   │           ├── auth_controller.rb         # Login, signup, OTP, OAuth, logout
│   │           ├── users_controller.rb        # GET /users/me, PATCH /users/:id
│   │           ├── onboarding_controller.rb   # 5-step onboarding flow
│   │           ├── dashboard_controller.rb    # Dashboard stats
│   │           ├── events_controller.rb       # CRUD events
│   │           ├── event_types_controller.rb  # CRUD event types
│   │           ├── contacts_controller.rb     # CRUD contacts
│   │           ├── schedules_controller.rb    # CRUD schedules
│   │           ├── integrations_controller.rb # OAuth connect/disconnect
│   │           └── availability/
│   │               ├── availability_schedules_controller.rb
│   │               ├── availability_overrides_controller.rb
│   │               └── conflicts_controller.rb
│   ├── models/
│   │   ├── user.rb                   # Core user with JWT, OTP, password reset
│   │   ├── session.rb                # JWT session tracking
│   │   ├── external_identity.rb      # OAuth provider identities
│   │   ├── event.rb                  # Calendar events
│   │   ├── event_type.rb             # Meeting type templates
│   │   ├── contact.rb                # User contacts
│   │   ├── schedule.rb               # Named schedules
│   │   ├── availability_schedule.rb  # Weekly availability rules
│   │   ├── availability_override.rb  # Date-specific overrides
│   │   ├── availability_slot.rb      # Time slots within schedules
│   │   └── date_override.rb          # Date overrides for schedules
│   ├── serializers/                  # JSON serializers for all models
│   ├── services/
│   │   ├── auth_service.rb           # Auth business logic (login, signup, OTP, OAuth)
│   │   ├── oauth_state_encoder.rb    # OAuth state parameter encoding
│   │   ├── integration/
│   │   │   └── connect_account.rb    # Integration linking service
│   │   ├── dashboard/                # Dashboard aggregation services
│   │   └── events/                   # Event business logic services
│   ├── mailers/
│   │   ├── application_mailer.rb
│   │   └── auth_mailer.rb            # OTP and password reset emails
│   └── jobs/                         # Solid Queue background jobs
├── config/
│   ├── routes.rb                     # All API routes under /api/v1/
│   ├── initializers/
│   │   ├── cors.rb                   # CORS configuration (credentials: true)
│   │   └── omniauth.rb              # OAuth provider configuration
│   ├── database.yml                  # PostgreSQL config
│   └── environments/                 # Rails environment configs
├── db/
│   ├── schema.rb                     # Current database schema
│   ├── migrate/                      # All migrations
│   └── seeds.rb                      # Seed data
├── spec/                             # RSpec test suite
└── .env                              # Environment variables (NEVER commit secrets)
```

---

## 🔐 AUTHENTICATION (LOCKED — DO NOT CHANGE)

### Token Generation & Validation

```ruby
# User model — generate_token creates a JWT + Session record
user.generate_token   # → JWT string (stored in sessions table)
User.from_token(jwt)  # → User instance (validates JWT + session not expired)
```

### Cookie Rules (CRITICAL — NEVER MODIFY)

```ruby
# In auth_controller.rb — ALL cookie settings MUST use:
cookies[:token] = {
  value: token,
  httponly: false,       # ← MUST be false — frontend reads via document.cookie
  secure: Rails.env.production?,
  same_site: :lax,
  path: '/',
  expires: 30.days.from_now
}
```

> **⚠️ Setting `httponly: true` will break the frontend auth flow and cause redirect loops.**
> This was debugged and hardened. DO NOT CHANGE.

### Token Extraction (base_controller.rb)

The backend accepts tokens from **two sources** (checked in this order):
1. `Authorization: Bearer <token>` header
2. `token` cookie

```ruby
def token
  # 1. Try Authorization header first
  # 2. Fall back to cookie
end
```

### OAuth Dual-Mode Callback

```
omniauth_callback has TWO modes:
├── AUTHENTICATION MODE (no token param) → Login/Signup via OAuth
│   └── Creates user if needed, generates JWT, redirects to frontend /callback#token=...
└── CONNECTION MODE (token param present) → Link integration to existing user
    └── Validates token, connects integration, NEVER creates user
```

### Endpoints That Skip Authentication

```ruby
skip_before_action :authenticate_user!, only: %i[
  login signup verify_otp resend_otp
  forgot_password reset_password
  oauth_authorize omniauth_callback omniauth_failure
]
```

---

## 📊 DATABASE SCHEMA

### Core Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `users` | User accounts | email, password_digest, full_name, status, timezone, onboarding_stage, availability (JSONB), integrations (JSONB) |
| `sessions` | JWT session tracking | token, user_id, expires_at, device_info |
| `external_identities` | OAuth provider links | user_id, provider, uid, access_token, refresh_token, scopes (JSONB) |
| `events` | Calendar events | user_id, event_type_id, title, start_time, end_time, status |
| `event_types` | Meeting templates | user_id, title, duration, color, location |
| `contacts` | User contacts | user_id, first_name, last_name, email, phone, status |
| `schedules` | Named schedules | user_id, name, is_default |
| `availability_schedules` | Weekly rules | user_id, day_of_week, start_time, end_time, timezone |
| `availability_overrides` | Date-specific overrides | user_id, date, start_time, end_time, is_unavailable |

### Schema Change Rules

- ❌ NEVER edit `schema.rb` directly
- ✅ Always create a new migration: `rails generate migration AddColumnToTable`
- ✅ Run `rails db:migrate` and commit the updated `schema.rb`
- ✅ Update serializers and type definitions in `web/` and `mobile/` simultaneously

---

## 📡 API ROUTES

All routes are under `/api/v1/`:

### Auth
| Method | Path | Controller#Action |
|--------|------|------------------|
| POST | `/auth/login` | auth#login |
| POST | `/auth/signup` | auth#signup |
| POST | `/auth/verify-otp` | auth#verify_otp |
| POST | `/auth/resend-otp` | auth#resend_otp |
| POST | `/auth/forgot-password` | auth#forgot_password |
| POST | `/auth/reset-password` | auth#reset_password |
| POST | `/auth/logout` | auth#logout |
| POST | `/auth/refresh` | auth#refresh |
| GET | `/auth/:provider/authorize` | auth#oauth_authorize |
| GET | `/auth/:provider/callback` | auth#omniauth_callback |

### Users
| Method | Path | Controller#Action |
|--------|------|------------------|
| GET | `/users/me` | users#me |
| PATCH | `/users/:id` | users#update |

### Onboarding (5 steps)
| Method | Path | Controller#Action |
|--------|------|------------------|
| POST | `/onboarding/profile` | onboarding#profile |
| POST | `/onboarding/integrations` | onboarding#integrations |
| POST | `/onboarding/availability` | onboarding#availability |
| POST | `/onboarding/meeting-types` | onboarding#meeting_types |
| POST | `/onboarding/finalise` | onboarding#finalise |

### Resources (Standard RESTful)
| Resource | Path | Actions |
|----------|------|---------|
| Events | `/events` | index, create, update, destroy |
| Event Types | `/event_types` | full CRUD |
| Contacts | `/contacts` | full CRUD |
| Schedules | `/schedules` | full CRUD |
| Availability Schedules | `/availability/schedules` | index, create, update, destroy |
| Availability Overrides | `/availability/overrides` | index, create, update, destroy |
| Integrations | `/integrations` | index, destroy |

### Standard Response Format

```json
{
  "success": true|false,
  "data": { ... },
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  },
  "message": "Optional success message"
}
```

---

## 🧩 SERVICE OBJECT PATTERN

All business logic goes in service objects — **controllers contain NO business logic**.

```ruby
# Pattern:
class SomeService
  def initialize(params)
    @params = params
  end

  def call
    # business logic
    { success: true, data: { ... } }
  rescue => e
    { success: false, error: { code: 'ERROR_CODE', message: e.message } }
  end
end

# Usage in controller:
result = SomeService.new(params).call
render json: result, status: result[:success] ? :ok : :unprocessable_entity
```

### Existing Services

| Service | Purpose |
|---------|---------|
| `AuthService` | Login, signup, OTP verification, password reset, OAuth |
| `Integration::ConnectAccount` | Link OAuth providers to users (connect mode) |
| `OauthStateEncoder` | Encode/decode OAuth state parameter |
| `Dashboard::*` | Dashboard statistics aggregation |
| `Events::*` | Event business logic |

---

## 🔌 CORS CONFIGURATION (LOCKED — DO NOT CHANGE)

```ruby
# config/initializers/cors.rb
credentials: true                    # Required for cookie-based auth
origins: exact match list            # localhost:3001 + FRONTEND_URL
```

- ✅ `credentials: true` is mandatory
- ✅ Origins must be exact matches (no wildcards with credentials)
- ❌ NEVER use `*` as origin with `credentials: true`

---

## 🧪 TESTING RULES

- Use **RSpec** for all tests
- Use **FactoryBot** for test data
- Use **Faker** for realistic test values
- Test directory: `spec/`
- Run tests: `bundle exec rspec`
- Run specific test: `bundle exec rspec spec/path_to_spec.rb`

---

## ❌ ABSOLUTE DON'TS

- ❌ Change `httponly` to `true` on the token cookie
- ❌ Put business logic in controllers
- ❌ Create/modify users during integration Connect mode
- ❌ Edit `schema.rb` directly (use migrations)
- ❌ Remove CORS `credentials: true`
- ❌ Use wildcards for CORS origins
- ❌ Hardcode URLs or secrets
- ❌ Skip serializers when returning user/model data
- ❌ Break existing API response format
- ❌ Use `find_or_create_by` in OAuth Connect callbacks

## ✅ ALWAYS DO

- ✅ Use service objects for business logic
- ✅ Use serializers for JSON responses
- ✅ Create migrations for schema changes
- ✅ Follow the standard `{ success, data, error }` response format
- ✅ Handle errors with proper error codes
- ✅ Accept tokens from both header AND cookie
- ✅ Update `web/` and `mobile/` type definitions when API changes
- ✅ Write RSpec tests for new features
- ✅ Use environment variables for configuration