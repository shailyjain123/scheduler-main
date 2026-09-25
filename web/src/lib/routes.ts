export const ONBOARDING_ROUTES = {
	profile: '/onboarding/profile',
	integrations: '/onboarding/integrations',
	availability: '/onboarding/availability',
	meetingTypes: '/onboarding/meeting-types',
	finalise: '/onboarding/finalise',
} as const;

export const onboardingPagePath = (stage: number): string => {
	switch (stage) {
		case 1:
			return ONBOARDING_ROUTES.profile;
		case 2:
			return ONBOARDING_ROUTES.integrations;
		case 3:
			return ONBOARDING_ROUTES.availability;
		case 4:
			return ONBOARDING_ROUTES.meetingTypes;
		case 5:
			return ONBOARDING_ROUTES.finalise;
		default:
			return ONBOARDING_ROUTES.profile;
	}
};

export const APP_ROUTES = {
	dashboard: '/dashboard',
	events: '/events',
	meetings: '/meetings',
	availability: '/availability',
	contacts: '/contacts',
	settings: '/settings',
} as const;
