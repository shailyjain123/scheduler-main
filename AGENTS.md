# 🎯 SCHEDULER — ROOT CONTROLLER REPOSITORY

> **This document is the single source of truth for AI coding agents working in this repository.**
> **DO NOT modify the rules, patterns, or architecture defined below without explicit user approval.**

---

## 📊 ARCHITECTURE OVERVIEW

```
scheduler/                    (Root — Main Orchestrator)
├── backend/                  (Git Submodule) → Rails 8 API-only
├── web/                      (Git Submodule) → Next.js 16 Web Client
├── mobile/                   (Git Submodule) → React Native / Expo 54
├── AGENTS.md                 → This file (root rules)
├── MASTER_PLAN.md            → Product roadmap & feature specs
├── start.sh                  → Unified dev launcher (all services)
└── tmp/                      → Ephemeral scratch files
```

### Tech Stack Summary

| Layer | Technology | Version | Port |
|-------|-----------|---------|------|
| **API** | Ruby on Rails (API-only) | 8.1 | `3000` |
| **Database** | PostgreSQL | 16+ | `5432` |
| **Auth Tokens** | JWT (via `jwt` gem) + `bcrypt` | — | — |
| **Web Client** | Next.js + React | 16.2 / 19.2 | `3001` |
| **Mobile Client** | React Native + Expo | 0.81 / 54 | — |
| **State Management** | Zustand | 5.x | — |
| **CSS** | Tailwind CSS | 4.x | — |
| **Background Jobs** | Solid Queue | — | — |
| **OAuth** | OmniAuth (Google, Microsoft, Slack, Zoom) | 2.x | — |

---

## 🔗 REPOSITORY STRUCTURE

| Repo | Role | Entry Point |
|------|------|-------------|
| `backend/` | API, Auth, Business Logic, Data Models | `http://localhost:3000` |
| `web/` | Browser UI, Web Navigation, Client Services | `http://localhost:3001` |
| `mobile/` | Mobile UI, Mobile Navigation, Mobile Services | Expo / iOS / Android |

### Submodule Rules

- Each repo is a **Git submodule** under `scheduler/`
- Repos have **independent** `.git`, package managers, and deployments
- Backend is the **single source of truth** for all APIs and data models
- Local paths can be swapped for remote GitHub URLs later

---

## 🛠 DEVELOPMENT

### Starting Services

```bash
./start.sh                      # Start backend :3000 + web :3001
```

### Git Operations Across All Repos

```bash
# Manual — there is no scripts/ helper currently
cd backend && git pull && cd ..
cd web && git pull && cd ..
cd mobile && git pull && cd ..
```

---

## 🔐 AUTHENTICATION ARCHITECTURE (LOCKED — DO NOT CHANGE)

> **⚠️ CRITICAL: The authentication system described below was debugged and hardened.**
> **Any AI agent MUST follow these exact patterns. Deviation will re-introduce redirect loops.**

### Token Flow

```
Login/OAuth → Backend sets cookie (httponly: false, SameSite=Lax, Path=/)
           → Backend returns token in JSON response body
           → Frontend stores token in BOTH localStorage AND document.cookie
           → Frontend stores serialized user in localStorage
           → Redirect via window.location.assign() (NOT router.push)
```

### Cookie Settings (Backend — `auth_controller.rb`)

```ruby
cookies[:token] = {
  value: token,
  httponly: false,        # ← MUST be false (frontend reads via document.cookie)
  secure: Rails.env.production?,
  same_site: :lax,
  path: '/',
  expires: 30.days.from_now
}
```

**WHY `httponly: false`**: The Next.js proxy (`proxy.ts`) runs on the Edge and reads the cookie.
The frontend AuthProvider also reads it via `document.cookie` on hydration.
Setting `httponly: true` makes the cookie invisible to JavaScript, causing a redirect loop.

### Frontend Auth State (Zustand — `authStore.ts`)

```
setAuth(user, token)
  ├── IF token provided → save to localStorage + write cookie
  ├── IF token is null  → DO NOT remove existing token (preserve session)
  ├── Always save user to localStorage
  └── Resolve effectiveToken = new token || existing localStorage token
```

**NEVER** call `localStorage.removeItem('token')` inside `setAuth()` when token is null.
This was the primary cause of the redirect loop — hydration cleared active sessions.

### Frontend Hydration (AuthProvider.tsx)

```
1. Read token from localStorage (preferred) or document.cookie
2. Sync cookie from localStorage if cookie is missing
3. If token + cached user exist → setAuth() → DONE (instant restore)
4. If token exists but no user → call GET /users/me → setAuth()
5. If /users/me fails with 401 → clear everything → show login
6. If no token at all → mark hydrated → show login
```

### API Client 401 Handling (client.ts)

- `/users/me` is in the 401 bypass list — hydration handles its failure
- 401 handler checks `isHydrated` — never redirects during initial hydration
- `/callback` paths are bypassed to prevent race conditions during OAuth

### Next.js Proxy (proxy.ts — replaces deprecated middleware.ts)

> **Next.js 16.2+ renamed `middleware.ts` to `proxy.ts`.** Do NOT create `middleware.ts`.

- Runs on Edge BEFORE page render
- Only checks `token` cookie (NOT localStorage — unavailable on Edge)
- Protected routes: `/dashboard`, `/meetings`, `/availability`, `/contacts`
- Onboarding routes are NOT protected (need to capture OAuth hash fragments)
- If no cookie → redirect to `/login`

### OAuth Callback Flow (callback/page.tsx)

```
1. Parse #token=...&target=... from URL hash
2. Write token to localStorage AND document.cookie immediately
3. Fetch /users/me to get full user profile
4. setAuth(user, token) to populate store
5. window.location.assign(target) — MUST be full navigation
```

**NEVER use `router.push()` after OAuth** — it's client-side only and the proxy
won't see the freshly-written cookie on the server-side request.

### CORS Configuration (Backend — `cors.rb`)

```ruby
credentials: true              # Required for cookie-based auth
origins: exact match list       # localhost:3001 + FRONTEND_URL
```

---

## 🔌 OAUTH / SSO / INTEGRATION SECURITY RULES (LOCKED)

### Rule 1: Separate Login vs Connect flows
- **Login Flow**: No user logged in. May create or authenticate a user.
- **Connect Flow**: User already logged in. NEVER creates or switches users. Must pass `token` parameter.

### Rule 2: Never auto-create a user from a Connect callback
Forbidden: `User.find_or_create_by(email:)`, `User.create!(...)`, `sign_in(user)` in connect mode.

### Rule 3: Email mismatch must fail loudly
If provider email ≠ `current_user.email` → raise error, do NOT silently continue.

### Rule 4: UID ownership is globally unique
One provider UID → one internal user. Reject linking if UID already belongs to another user.

### Rule 5: Session must never change during Connect flow
`current_user.id` before callback MUST equal `current_user.id` after callback.

### Rule 6: Use `Integration::ConnectAccount.call(...)` for all providers
Never duplicate linking logic in controllers.

### Rule 7: Automated tests for every provider
Cover: matching email, mismatched email, UID already linked, no logged-in user, session preserved.

### Rule 8: Fail secure, never fail open
Missing/blank/untrusted email → reject connection, never create fallback user.

### Rule 9: Controllers contain no business logic
Controllers receive callback → call service → render/redirect.

---

## 🎨 DESIGN ENFORCEMENT

### Google Stitch MCP Server
This project uses **Google Stitch** for UI design generation.

**Requirements:**
- ✅ Follow EXACT design from Stitch MCP
- ✅ Pixel-perfect implementation required
- ✅ NO custom UI/UX decisions without design approval
- ✅ NO ad-hoc layout/spacing/color modifications

**If changes are needed:**
1. Request design update from Stitch MCP
2. Wait for official revision
3. Implement exact revision
4. Never modify ad-hoc

---

## 📡 API CONTRACT RULES

### Backend is the Source of Truth

Any API change MUST be reflected in:
- ✅ `backend/` (model, controller, serializer, routes)
- ✅ `web/` (API client, hooks, stores, types)
- ✅ `mobile/` (API client, services, stores)

### Consistent Contracts
- Same request structure across all clients
- Same response format (`{ success, data, error, message }`)
- Same error codes
- Same HTTP status codes

### DO NOT break existing APIs without updating all clients simultaneously.

---

## 🔐 ENVIRONMENT VARIABLES

Each app has its own `.env`:
- `backend/.env`
- `web/.env.local`
- `mobile/.env`

**API URLs come from environment variables — NEVER hardcode:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
```

---

## 📁 CODE OWNERSHIP

| Directory | Owns | Does NOT Own |
|-----------|------|-------------|
| `backend/` | Models, Controllers, Serializers, Auth, Business Logic, Migrations | UI, Navigation, Client State |
| `web/` | Web UI, Web Navigation, Web Client Services, Zustand Stores | API Logic, Auth Implementation, Data Models |
| `mobile/` | Mobile UI, Mobile Navigation, Mobile Client Services | API Logic, Auth Implementation, Data Models |

---

## ❌ ABSOLUTE DON'TS

- ❌ Change `httponly` to `true` on the token cookie
- ❌ Call `localStorage.removeItem('token')` inside `setAuth()` when token is null
- ❌ Use `router.push()` after OAuth callback (use `window.location.assign()`)
- ❌ Redirect to `/login` from the 401 handler during hydration (`isHydrated === false`)
- ❌ Remove `/users/me` from the 401 bypass list
- ❌ Modify Stitch MCP UI designs without approval
- ❌ Break API contracts without updating all clients
- ❌ Hardcode environment values (URLs, secrets, keys)
- ❌ Add UI components outside of Stitch designs
- ❌ Change database schemas without migrations in `backend/`
- ❌ Deploy one app without testing others
- ❌ Couple repositories tightly or share code directly between them
- ❌ Create `middleware.ts` — use `proxy.ts` instead (Next.js 16.2+ convention)

## ✅ ALWAYS DO

- ✅ Keep repos independent but coordinated
- ✅ Update all 3 repos when API changes
- ✅ Follow Stitch design system exactly
- ✅ Use environment variables
- ✅ Write tests in each repo
- ✅ Document API changes in backend
- ✅ Make coordinated releases
- ✅ Read the sub-repo `AGENTS.md` before working in that repo

---

## 📚 SUB-REPO DOCUMENTATION

Each sub-repository has its own `AGENTS.md` with repo-specific rules:

- **`backend/AGENTS.md`** — Rails API patterns, model schemas, service objects, auth internals
- **`web/AGENTS.md`** — Next.js patterns, component hierarchy, state management, middleware
- **`mobile/AGENTS.md`** — React Native patterns, navigation, Expo configuration
