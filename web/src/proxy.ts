import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Proxy (formerly Middleware)
 * Runs on the Edge runtime BEFORE page rendering.
 * Protects authenticated routes by checking for the `token` cookie.
 *
 * IMPORTANT: This only gates initial navigation. Client-side auth state
 * is managed by AuthProvider + useAuthStore.
 *
 * ⚠️ LOCKED — DO NOT DELETE OR RENAME THIS FILE.
 * In Next.js 16+, `proxy.ts` replaces the deprecated `middleware.ts`.
 * Without this file, all protected routes are publicly accessible.
 */
export function middleware(request: NextRequest) {
  return proxy(request);
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protected routes that require authentication at server level
  // NOTE: Onboarding routes are NOT protected here because:
  // 1. They need to load to capture OAuth hash fragments from callbacks
  // 2. Each onboarding page has useOnboardingProtection hook for client-side auth checks
  // 3. Hash fragments are client-only, proxy can't see them
  const protectedRoutes = ['/dashboard', '/meetings', '/availability', '/contacts'];
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  // Check if user has authentication token in cookie
  const token = request.cookies.get('token')?.value;

  if (isProtected && !token) {
    // No token cookie — redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Configure which paths the proxy should run on.
export const config = {
  matcher: ['/dashboard/:path*', '/meetings/:path*', '/availability/:path*', '/contacts/:path*'],
};
