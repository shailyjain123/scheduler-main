# Mobile — React Native + Expo

React Native mobile client for the Scheduler platform. Runs on iOS and Android via Expo.

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React Native | 0.81 |
| Platform | Expo | 54 |
| Language | TypeScript | 5.9 |
| Navigation | React Navigation (Native Stack) | 7.x |
| State | Zustand | 5.x |
| HTTP Client | Axios | 1.x |
| Auth | expo-auth-session + expo-web-browser | latest |
| Storage | AsyncStorage | 3.x |
| Icons | @expo/vector-icons | 15.x |

---

## Prerequisites

- Node.js `18+` (or `20+` recommended)
- npm `10+`
- **iOS**: Xcode 15+ with iOS Simulator (macOS only)
- **Android**: Android Studio with an emulator, or a physical device with USB debugging
- Expo Go app on your device (for quick testing without a build)
- Backend running at `http://localhost:3000`

---

## Setup

### 1. Install dependencies

```bash
cd mobile
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your local values (see [Environment Variables](#environment-variables) below).

---

## Environment Variables

Create `mobile/.env`:

```env
# Required — URL of the Rails backend API
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000

# Your web frontend URL (used for OAuth redirect targets)
EXPO_PUBLIC_FRONTEND_URL=http://localhost:3001

# Google OAuth Client ID (native/mobile client ID from Google Console)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=
```

> All mobile env vars must be prefixed with `EXPO_PUBLIC_` to be accessible in the app bundle.

> ⚠️ When testing on a physical device, replace `localhost` with your machine's local IP address (e.g., `http://192.168.1.10:3000`).

---

## Running the App

```bash
# Start the Expo dev server
npm start

# Open on iOS Simulator (macOS only)
npm run ios

# Open on Android Emulator / device
npm run android

# Open in browser (limited functionality)
npm run web
```

After running `npm start`, scan the QR code with the **Expo Go** app on your device for instant testing without installing a native build.

---

## Project Structure

```
mobile/
├── App.tsx                     # Root component (NavigationContainer)
├── index.ts                    # Entry point (registerRootComponent)
├── app.json                    # Expo configuration (name, icons, splash)
├── src/
│   ├── components/             # Reusable UI components
│   ├── hooks/                  # Custom React hooks
│   ├── navigation/
│   │   ├── AppNavigator.tsx    # Root navigator (auth + main screens)
│   │   └── OnboardingNavigator.tsx
│   ├── screens/
│   │   ├── auth/               # Login, Signup, OTP
│   │   └── onboarding/         # 5-step onboarding
│   ├── services/
│   │   ├── apiClient.ts        # Axios client with auth headers
│   │   └── oauthService.ts     # OAuth via expo-auth-session
│   └── store/                  # Zustand state stores
└── assets/                     # App icon, splash image
```

---

## Auth Flow

- JWT tokens are stored in **AsyncStorage** (key: `'token'`)
- All API requests include `Authorization: Bearer <token>` via Axios interceptors
- OAuth uses `expo-auth-session` with the system browser (not in-app webview)
- Navigation is driven by auth state in Zustand — not by manual `navigate()` calls

---

## Troubleshooting

### Metro bundler fails to start
```bash
npm start -- --clear   # clears Metro cache
```

### Cannot connect to backend on a physical device
Replace `localhost` in `EXPO_PUBLIC_BACKEND_URL` with your machine's IP:
```bash
ipconfig getifaddr en0   # macOS — find your local IP
```

### iOS Simulator not launching
Ensure Xcode and Command Line Tools are installed:
```bash
xcode-select --install
```

### Android emulator not detected
Ensure `ANDROID_HOME` is set and the emulator is running before `npm run android`.

### Expo Go shows "Something went wrong"
Check the Metro bundler terminal for the actual error. Common causes: missing env vars, syntax errors, or incompatible native modules.

### OAuth callback not working
- Ensure the callback URL scheme in `app.json` matches your Google/Microsoft OAuth app configuration.
- Use `expo-auth-session` — never use in-app WebViews for OAuth.
