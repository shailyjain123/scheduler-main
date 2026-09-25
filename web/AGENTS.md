# 🌐 WEB — Next.js 16 Web Client

> **Read `scheduler/AGENTS.md` (root) FIRST.**
> **This document covers web-specific rules, patterns, and component architecture.**
> **DO NOT modify the rules, patterns, or architecture defined below without explicit user approval.**

---

## 📊 TECH STACK

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 16.2 |
| Language | TypeScript | 5.x |
| UI Library | React | 19.2 |
| Styling | Tailwind CSS | 4.x |
| State | Zustand | 5.x |
| Data Fetching | @tanstack/react-query + native fetch | 5.x |
| Icons | Material Symbols + Lucide | latest |
| Date Utils | date-fns | 4.x |
| Testing | Jest + React Testing Library | 30.x / 16.x |
| Node.js | (see `.nvmrc`) | 22.x |

---

## 📂 DIRECTORY STRUCTURE

```
web/
├── src/
│   ├── proxy.ts                           # Next.js Edge Proxy (auth gating, replaces deprecated middleware.ts)
│   ├── app/
│   │   ├── layout.tsx                     # Root layout (AuthProvider + ReactQueryProvider)
│   │   ├── page.tsx                       # Landing/redirect page
│   │   ├── globals.css                    # Global styles + Tailwind
│   │   ├── (auth)/                        # Auth route group (no middleware protection)
│   │   │   ├── layout.tsx                 # Auth layout (split-screen branding)
│   │   │   ├── login/page.tsx             # Login + Signup + Forgot/Reset password
│   │   │   ├── signup/                    # Signup page
│   │   │   ├── verify-otp/               # OTP verification
│   │   │   └── callback/page.tsx          # OAuth callback handler
│   │   ├── (main)/                        # Main app route group (protected)
│   │   │   ├── layout.tsx                 # Dashboard layout (Sidebar + Header)
│   │   │   ├── dashboard/page.tsx         # Dashboard
│   │   │   ├── meetings/page.tsx          # Calendar/Meetings view
│   │   │   ├── availability/page.tsx      # Availability management
│   │   │   ├── contacts/page.tsx          # Contacts management
│   │   │   └── events/page.tsx            # Events management
│   │   └── onboarding/                    # 5-step onboarding flow
│   │       ├── layout.tsx                 # Onboarding layout with progress bar
│   │       ├── profile/page.tsx           # Step 1: Profile setup
│   │       ├── integrations/page.tsx      # Step 2: OAuth integrations
│   │       ├── availability/page.tsx      # Step 3: Availability setup
│   │       ├── meeting-types/page.tsx     # Step 4: Meeting types
│   │       └── finalise/page.tsx          # Step 5: Final confirmation
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx           # Global auth hydration provider
│   │   │   └── LoginForm.tsx              # Login form component
│   │   ├── layout/
│   │   │   ├── sidebar.tsx                # Main sidebar navigation
│   │   │   └── header.tsx                 # Main header bar
│   │   ├── availability/                  # Availability components
│   │   ├── contacts/                      # Contact components
│   │   ├── dashboard/                     # Dashboard components
│   │   ├── events/                        # Event components
│   │   ├── meetings/                      # Calendar/meeting components
│   │   ├── modals/                        # Global modals (create event, confirmation)
│   │   ├── providers/                     # React Query provider
│   │   ├── ui/                            # Reusable UI primitives
│   │   └── OAuthErrorAlert.tsx            # OAuth error display component
│   ├── hooks/
│   │   ├── useAuth.ts                     # Auth actions (login, signup, logout, etc.)
│   │   └── useOnboardingProtection.ts     # Client-side onboarding guard
│   ├── store/
│   │   ├── authStore.ts                   # Auth state (user, token, hydration)
│   │   ├── modalStore.ts                  # Modal state management
│   │   └── uiStore.ts                     # UI state (sidebar collapse, etc.)
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts                  # API client (fetch + auth headers + 401 handling)
│   │   ├── hooks/                         # Shared lib hooks
│   │   ├── types/                         # TypeScript type definitions
│   │   ├── routes.ts                      # Route path helper functions
│   │   ├── availability.ts                # Availability utilities
│   │   ├── timezones.ts                   # Timezone utilities
│   │   └── oauthErrorHandler.ts           # OAuth error code mapping
│   ├── services/
│   │   └── apiClient.ts                   # Re-export of lib/api/client
│   ├── config/                            # App configuration
│   ├── types/                             # Additional TypeScript types
│   └── utils/                             # Utility functions
├── next.config.ts                         # Next.js configuration
├── tailwind.config.ts                     # Tailwind CSS configuration (v4)
├── tsconfig.json                          # TypeScript configuration
└── package.json                           # Dependencies
```

---

## 🔐 AUTHENTICATION FLOW (LOCKED — DO NOT CHANGE)

### Proxy (`src/proxy.ts`) — Replaces deprecated `middleware.ts`

> **Next.js 16.2+ renamed `middleware.ts` to `proxy.ts`.**
> The exported function is `proxy()` not `middleware()`. Do NOT create a `middleware.ts` file.

```typescript
// Runs on Edge BEFORE page render
// ONLY checks the `token` cookie (localStorage is NOT available on Edge)
// Protected routes: /dashboard, /meetings, /availability, /contacts
// If no cookie → redirect to /login
```

**Protected routes:**
- `/dashboard/**`
- `/meetings/**`
- `/availability/**`
- `/contacts/**`

**NOT protected (intentionally):**
- `/login`, `/signup`, `/verify-otp` — public auth pages
- `/callback` — OAuth callback (needs to capture hash fragments)
- `/onboarding/**` — client-side protection via `useOnboardingProtection`

### AuthProvider (`components/auth/AuthProvider.tsx`)

The AuthProvider wraps the entire app and handles session restoration on mount:

```
Mount → Read localStorage token + cookie
      → If both token + cached user → setAuth() → instant restore
      → If token but no user → GET /users/me → setAuth()
      → If /users/me fails with 401 → clear all → show login
      → If no token → setHydrated(true) → show login
```

**Critical rules:**
- ❌ NEVER call `/users/me` without a token
- ❌ NEVER clear auth on network errors (only on definitive 401)
- ✅ Always sync cookie from localStorage if cookie is missing
- ✅ Show splash screen until `isHydrated === true`

### Auth Store (`store/authStore.ts`)

```typescript
setAuth(user, token?)
  // token provided → save to localStorage + cookie
  // token null → PRESERVE existing token (DO NOT DELETE)
  // Always save user to localStorage
  // Resolve effectiveToken = new || existing

clearAuth()
  // Remove token from localStorage, cookie, and store
  // Only call when intentionally logging out or session is invalid
```

> **⚠️ CRITICAL: `setAuth(user, null)` must NEVER remove the token from localStorage.**
> This was the primary cause of the redirect loop.

### API Client (`lib/api/client.ts`)

```typescript
// Token resolution: localStorage → document.cookie
// Sends: Authorization: Bearer <token> header
// Also sends: credentials: 'include' (for cookie)
// 401 handling:
//   - Checks isHydrated before redirecting
//   - /users/me is in bypass list
//   - /callback paths are bypassed
//   - Only redirects if not on /login, /onboarding, /callback
```

### OAuth Callback (`app/(auth)/callback/page.tsx`)

```
1. Parse #token=...&target=... from URL hash
2. Write token to localStorage AND document.cookie BEFORE /users/me call
3. Fetch /users/me with fresh token
4. setAuth(user, token)
5. window.location.assign(target) — MUST use full navigation
```

> **⚠️ NEVER use `router.push()` after OAuth callback.**
> Client-side navigation doesn't send cookies to the middleware on server-side.

---

## 🏗 COMPONENT PATTERNS

### Route Groups
- `(auth)` — Public auth pages with split-screen branding layout
- `(main)` — Protected dashboard pages with Sidebar + Header layout
- `onboarding` — Semi-protected 5-step onboarding with progress bar

### Layout Hierarchy
```
RootLayout (fonts, AuthProvider, ReactQueryProvider)
├── (auth)/layout.tsx — Split-screen branding (left: brand, right: content)
├── (main)/layout.tsx — Dashboard shell (Sidebar + Header + content)
└── onboarding/layout.tsx — Onboarding shell (progress bar + content)
```

### State Management (Zustand)

| Store | Purpose | Key State |
|-------|---------|-----------|
| `authStore` | Auth state | user, token, isHydrated, isLoading, error |
| `modalStore` | Modal state | createEventModal, confirmationModal |
| `uiStore` | UI preferences | sidebarCollapsed (persisted) |

### Data Fetching

- **Auth calls**: Use `apiClient` directly via `useAuth` hook
- **Data queries**: Use `@tanstack/react-query` with `apiClient`
- **API base URL**: From `NEXT_PUBLIC_API_URL` env var (default: `http://localhost:3000`)

---

## 🎨 DESIGN SYSTEM

### Google Stitch MCP
All UI designs come from the Google Stitch MCP server. Follow designs **exactly**:
- ❌ NO custom colors, spacing, or layout changes
- ❌ NO ad-hoc UI component creation
- ✅ Pixel-perfect implementation of Stitch designs
- ✅ If a change is needed, request a design update first

### Tailwind CSS v4
- Use Tailwind utility classes
- Custom design tokens are in `globals.css`
- Use `tailwind-merge` for conditional class merging
- Font: Inter (via `next/font/google`)
- Icons: Material Symbols Outlined + Lucide React

### Typography & Colors (from Stitch "Intelligent Concierge" theme)
- Primary: `#5C6EFF` (Indigo)
- Background: `#f8f9fb`
- Text: `#191c1e` / `#757686`
- Surface tokens: `surface`, `surface-container-low`, etc.

---

## 📡 API CLIENT RULES

### Request Pattern
```typescript
const response = await apiClient.get<ResponseType>('/endpoint');
const response = await apiClient.post<ResponseType>('/endpoint', data);
const response = await apiClient.patch<ResponseType>('/endpoint', data);
const response = await apiClient.delete<ResponseType>('/endpoint');
```

### Response Handling
```typescript
if (response.success) {
  // Use response.data
} else {
  // Handle response.error?.code, response.error?.message
}
```

### 401 Bypass List (DO NOT REMOVE ENTRIES)
```typescript
'/auth/login', '/auth/signup', '/auth/verify-otp', '/auth/resend-otp',
'/auth/forgot-password', '/auth/reset-password',
'/auth/google/', '/auth/microsoft/', '/auth/slack/',
'/callback', '/users/me'
```

---

## 🧪 TESTING

- Framework: Jest + React Testing Library
- Test directory: `src/__tests__/`
- Run tests: `npm test`
- Run in watch mode: `npm run test:watch`
- Config: `jest.config.js`

---

## 🔐 ENVIRONMENT VARIABLES

```env
# web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- `NEXT_PUBLIC_API_URL` — API base URL (MUST have `NEXT_PUBLIC_` prefix for client-side access)
- `FRONTEND_URL` — Your frontend origin URL
- `BACKEND_URL` — Used by `next.config.ts` for allowed dev origins

---

## ❌ ABSOLUTE DON'TS

- ❌ Change `httponly` to `true` on the backend cookie (it MUST be `false`)
- ❌ Remove token from localStorage in `setAuth()` when token is null
- ❌ Use `router.push()` after OAuth callback
- ❌ Redirect to `/login` from 401 handler during hydration
- ❌ Remove `/users/me` from the 401 bypass list
- ❌ Create UI components that deviate from Stitch designs
- ❌ Hardcode API URLs
- ❌ Import from `node_modules` paths directly (use package names)
- ❌ Use `any` type without clear justification
- ❌ Skip the AuthProvider wrapper in root layout
- ❌ Make API calls without going through `apiClient`

## ✅ ALWAYS DO

- ✅ Use `window.location.assign()` for post-auth redirects
- ✅ Check `isHydrated` before acting on auth state in layouts
- ✅ Use Zustand stores for shared state
- ✅ Use `@tanstack/react-query` for server data
- ✅ Follow Stitch MCP designs exactly
- ✅ Use `'use client'` directive for components with hooks/state
- ✅ Keep API response types in sync with backend serializers
- ✅ Handle loading and error states in all pages
- ✅ Use environment variables for all URLs
- ✅ Write tests for new components and hooks