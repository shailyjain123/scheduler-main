import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { onboardingPagePath } from '@/lib/routes';

/**
 * Hook to protect onboarding pages
 * - Ensures user is authenticated
 * - Redirects to current stage page if user tries to skip ahead
 * - Redirects to dashboard if onboarding is complete
 */
export function useOnboardingProtection(requiredStage: number) {
  const router = useRouter();
  const { user, isHydrated, isLoading } = useAuthStore();
  const redirectProcessingRef = useRef(false);
  const lastRedirectTimeRef = useRef(0);

  useEffect(() => {
    // Wait for auth state to hydrate globally from AuthProvider
    if (!isHydrated || isLoading) {
      redirectProcessingRef.current = false;
      return;
    }

    // Prevent rapid-fire redirect spam (e.g., from race conditions during hydration)
    // If we just redirected, give at least 500ms before allowing another redirect
    const now = Date.now();
    if (redirectProcessingRef.current || (now - lastRedirectTimeRef.current < 500)) {
      return;
    }

    let shouldRedirect = false;
    let redirectPath = '';

    // Not authenticated - redirect to login
    if (!user) {
      shouldRedirect = true;
      redirectPath = '/login';
    }
    // Onboarding is complete - redirect to dashboard
    else if (user.onboarding_completed) {
      shouldRedirect = true;
      redirectPath = '/dashboard';
    }
    // User is trying to skip pages - redirect to current stage page
    else {
      const currentStage = user.onboarding_stage || 1;
      if (requiredStage > currentStage + 1) {
        shouldRedirect = true;
        redirectPath = onboardingPagePath(currentStage);
      }
    }

    if (shouldRedirect) {
      redirectProcessingRef.current = true;
      lastRedirectTimeRef.current = now;
      console.debug(`[OnboardingProtection] Redirecting to ${redirectPath}`);
      router.push(redirectPath);
    }
  }, [user, isLoading, requiredStage, router, isHydrated]);

  // Return loading state and authorization status
  return {
    isAuthorized: isHydrated && !isLoading && !!user && !user.onboarding_completed,
    isLoading: !isHydrated || isLoading,
  };
}
