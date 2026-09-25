# Web — Next.js 16 Client

Browser-based frontend for the Scheduler platform. Consumes the Rails backend API and renders the full scheduling UI.

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 16.2 |
| Language | TypeScript | 5.x |
| UI Library | React | 19.2 |
| Styling | Tailwind CSS | 4.x |
| State | Zustand | 5.x |
| Data Fetching | TanStack Query | 5.x |
| Icons | Lucide React | latest |
| Date Utils | date-fns + date-fns-tz | 4.x |
| Testing | Jest + React Testing Library | 30.x / 16.x |
| Node.js | 20.x LTS | (see `.nvmrc`) |

---

## Prerequisites

- Node.js `20.x` — use [nvm](https://github.com/nvm-sh/nvm):
  ```bash
  nvm use   # reads .nvmrc automatically
  ```
- npm `10+` (bundled with Node.js 20)
- Backend running at `http://localhost:3000`

---

## Setup

### 1. Install dependencies

```bash
cd web
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` (see [Environment Variables](#environment-variables) below).

### 3. Start the development server

```bash
npm run dev      # starts on http://localhost:3001
```

---

## Environment Variables

Create `web/.env.local` (never commit secrets):

```env
# Required — URL of the Rails backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Used by next.config.ts for allowed dev origins
BACKEND_URL=http://localhost:3000

# Your frontend origin
FRONTEND_URL=http://localhost:3001
```

> `NEXT_PUBLIC_` prefix is required for variables used in the browser. Variables without this prefix are server-only.

---

## Commands

```bash
# Start development server (hot reload)
npm run dev

# Production build
npm run build

# Start production server (after build)
npm start

# Lint
npm run lint

# Auto-fix lint errors
npm run lint:fix

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

---

## Project Structure

```
web/src/
├── proxy.ts                     # Edge proxy — auth gating (replaces deprecated middleware.ts)
├── app/
│   ├── layout.tsx               # Root layout (AuthProvider + QueryProvider)
│   ├── (auth)/                  # Public auth pages (login, signup, OTP, OAuth callback)
│   ├── (main)/                  # Protected pages (dashboard, meetings, availability, contacts)
│   └── onboarding/              # 5-step onboarding flow
├── components/
│   ├── auth/AuthProvider.tsx    # Session hydration on app load
│   ├── layout/                  # Sidebar, Header
│   ├── ui/                      # Reusable primitives
│   └── ...                      # Feature components
├── store/
│   ├── authStore.ts             # Auth state (user, token, hydration flag)
│   ├── modalStore.ts            # Modal open/close state
│   └── uiStore.ts               # UI preferences (sidebar collapse)
├── lib/api/client.ts            # API client (auth headers + 401 handling)
├── hooks/useAuth.ts             # Auth actions (login, logout, signup)
└── lib/types/                   # Shared TypeScript types
```

---

## Auth Flow (Critical — Do Not Change)

The frontend auth system has strict rules to avoid session loops. Key points:

- Token is stored in both **localStorage** AND **`document.cookie`**
- The Edge proxy (`proxy.ts`) reads only the **cookie** (localStorage is unavailable on the Edge)
- `AuthProvider` restores session on mount by reading localStorage first, then cookie
- After OAuth, always redirect with `window.location.assign()` — never `router.push()`
- The API client never redirects during initial hydration (`isHydrated === false`)

For full details see [`AGENTS.md`](AGENTS.md).

---

## Testing

Tests live in `src/__tests__/`.

```bash
npm test                  # run all tests
npm run test:watch        # watch mode
```

Config: `jest.config.js` | Setup: `jest.setup.ts`

---

## Troubleshooting

### `npm install` fails with native binding errors (Tailwind Oxide)
This can happen when switching Node versions or architectures:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Dev server starts but API calls fail (CORS / network errors)
- Confirm the backend is running on port `3000`.
- Check `NEXT_PUBLIC_API_URL=http://localhost:3000` in `.env.local`.
- Restart the dev server after any `.env.local` change.

### Redirect loop after login
- The backend token cookie must have `httponly: false` — do not change this.
- Check that `NEXT_PUBLIC_API_URL` points to the correct backend.
- Clear browser localStorage and cookies, then try again.

### `Cannot find module` errors after pulling latest
```bash
npm install
```

### Performance API errors in development (negative timestamp)
Known transient dev-mode issue with Turbopack and remounting. Reload the page — it does not affect production builds.
