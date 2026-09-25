import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IntegrationsPage from '@/app/onboarding/integrations/page';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/apiClient';
import { useRouter } from 'next/navigation';
import { useOnboardingProtection } from '@/hooks/useOnboardingProtection';

jest.mock('@/store/authStore');
jest.mock('@/services/apiClient');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/hooks/useOnboardingProtection', () => ({
  useOnboardingProtection: jest.fn(),
}));

describe('IntegrationsPage', () => {
  const mockPush = jest.fn();
  const mockSetAuth = jest.fn();
  const mockUser = {
    id: 1,
    onboarding_stage: 2,
    integrations: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useOnboardingProtection as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthorized: true,
    });
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: mockUser,
      setAuth: mockSetAuth,
    });
  });

  it('renders correctly and handles submission', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: { ...mockUser, onboarding_stage: 3 } },
    });

    render(<IntegrationsPage />);
    
    expect(screen.getByText('Integrations setup')).toBeInTheDocument();
    
    // Check for some key integrations
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    expect(screen.getByText('Outlook Calendar')).toBeInTheDocument();

    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/onboarding/integrations', {
        integrations: { connected: [] }
      });
      expect(mockPush).toHaveBeenCalledWith('/onboarding/availability');
    });
  });
});
