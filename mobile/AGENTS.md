# 📱 MOBILE — React Native + Expo Application

> **Read `scheduler/AGENTS.md` (root) FIRST.**
> **This document covers mobile-specific rules, patterns, and navigation architecture.**
> **DO NOT modify the rules, patterns, or architecture defined below without explicit user approval.**

---

## 📊 TECH STACK

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React Native | 0.81 |
| Platform | Expo | 54 |
| Language | TypeScript | 5.9 |
| Navigation | React Navigation (Native Stack) | 7.x |
| State | Zustand | 5.x |
| HTTP Client | Axios | 1.x |
| Auth | expo-auth-session + expo-web-browser | latest |
| Storage | @react-native-async-storage/async-storage | 3.x |
| Icons | @expo/vector-icons | 15.x |
| SVG | react-native-svg | 15.x |

---

## 📂 DIRECTORY STRUCTURE

```
mobile/
├── App.tsx                          # Root component (navigation container)
├── index.ts                         # Entry point (registerRootComponent)
├── app.json                         # Expo configuration
├── src/
│   ├── components/                  # Reusable UI components
│   ├── hooks/                       # Custom React hooks
│   ├── navigation/
│   │   ├── AppNavigator.tsx         # Main navigation stack (auth + app screens)
│   │   └── OnboardingNavigator.tsx  # Onboarding sub-navigator
│   ├── screens/
│   │   ├── auth/                    # Login, signup, OTP screens
│   │   └── onboarding/             # Onboarding step screens
│   ├── services/
│   │   ├── apiClient.ts             # API client (Axios + auth headers)
│   │   ├── oauthService.ts          # OAuth flow with expo-auth-session
│   │   └── integrationLinkingService.ts  # Integration connection logic
│   └── store/                       # Zustand state stores
├── assets/                          # Images, fonts, icons
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies
```

---

## 🔐 AUTHENTICATION

### Token Storage
- Tokens are stored in **AsyncStorage** (not SecureStore for now)
- Token key: `'token'`
- User key: `'user'`

### Auth Flow
```
Login → POST /api/v1/auth/login → Get JWT token
     → Store in AsyncStorage
     → Navigate to Onboarding or Dashboard

OAuth → expo-auth-session → Open browser
     → Callback URL → Parse token from response
     → Store in AsyncStorage
     → Navigate accordingly
```

### API Client (`services/apiClient.ts`)
```typescript
// Uses Axios with baseURL from environment
// Authorization header: Bearer <token> from AsyncStorage
// All requests include credentials
```

### Token Rules
- ✅ Always store token in AsyncStorage after successful auth
- ✅ Always include `Authorization: Bearer <token>` in API requests
- ❌ Never store tokens in component state (use AsyncStorage + Zustand)
- ❌ Never hardcode API URLs

---

## 🗺 NAVIGATION

### Navigator Hierarchy
```
AppNavigator (Native Stack)
├── LoginScreen
├── SignupScreen
├── OTPScreen
├── OnboardingNavigator (Nested Stack)
│   ├── ProfileScreen
│   ├── IntegrationsScreen
│   ├── AvailabilityScreen
│   ├── MeetingTypesScreen
│   └── FinaliseScreen
├── DashboardScreen
├── MeetingsScreen
├── AvailabilityScreen
├── ContactsScreen
└── SettingsScreen
```

### Navigation Rules
- Auth screens are shown when no token in AsyncStorage
- Onboarding screens are shown when `onboarding_completed === false`
- Main app screens are shown when `onboarding_completed === true`
- Navigation state is driven by auth store, NOT by manual navigation

---

## 🔌 OAUTH (MOBILE-SPECIFIC)

### OAuth with Expo
```typescript
// Uses expo-auth-session for OAuth flows
// Opens system browser (NOT in-app webview)
// Callback URL scheme defined in app.json
// Token extracted from callback URL parameters
```

### Integration Linking
- `integrationLinkingService.ts` handles connecting providers
- Same dual-mode pattern as web (Login vs Connect)
- ❌ Never create users during Connect mode
- ✅ Always pass existing token during Connect mode

---

## 🎨 DESIGN SYSTEM

### Google Stitch MCP
All UI designs come from the Google Stitch MCP server, same as web:
- ❌ NO custom colors, spacing, or layout changes
- ❌ NO ad-hoc UI component creation
- ✅ Pixel-perfect implementation of Stitch designs
- ✅ If a change is needed, request a design update first

### Visual Guidelines
- Follow iOS and Android platform conventions
- Use safe area context for all screens
- Minimum touch target: 44x44 points
- Font: System default (no custom fonts configured yet)
- Colors: Match web theme (`#5C6EFF` primary, etc.)

---

## 📡 API CLIENT RULES

### Request Pattern
```typescript
// All API calls go through services/apiClient.ts
const response = await apiClient.get('/endpoint');
const response = await apiClient.post('/endpoint', data);
```

### Response Handling
- Same `{ success, data, error }` format as web
- Same error codes as backend
- Handle 401 → clear AsyncStorage → navigate to LoginScreen

---

## 🔐 ENVIRONMENT VARIABLES

```env
# mobile/.env
API_URL=http://localhost:3000
```

- `API_URL` — Base URL for backend API
- Environment variables accessed via Expo's `Constants.expoConfig.extra`

---

## 🧪 TESTING

- Currently no test framework configured
- Future: Jest + React Native Testing Library
- Run app: `npm start` (Expo dev server)
- Run on iOS: `npm run ios`
- Run on Android: `npm run android`

---

## ❌ ABSOLUTE DON'TS

- ❌ Hardcode API URLs
- ❌ Store tokens in component state instead of AsyncStorage
- ❌ Create users during integration Connect mode
- ❌ Use in-app webviews for OAuth (use system browser)
- ❌ Navigate directly without going through auth state
- ❌ Create UI components that deviate from Stitch designs
- ❌ Break API response format compatibility with web
- ❌ Import web-specific modules (next/router, document, etc.)

## ✅ ALWAYS DO

- ✅ Use AsyncStorage for token persistence
- ✅ Use Zustand for shared state
- ✅ Use Axios-based apiClient for all API calls
- ✅ Follow React Navigation patterns
- ✅ Use safe area context for layout
- ✅ Handle loading and error states
- ✅ Keep API types in sync with backend changes
- ✅ Use expo-auth-session for OAuth flows
- ✅ Test on both iOS and Android platforms
- ✅ Follow Stitch MCP designs exactly
