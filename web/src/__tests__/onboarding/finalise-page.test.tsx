import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinalisePage from '@/app/onboarding/finalise/page';
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

describe('FinalisePage', () => {
  const mockPush = jest.fn();
  const mockSetAuth = jest.fn();
  const mockUser = {
    id: 1,
    username: 'test-user',
    onboarding_stage: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: { event_types: [] },
    });
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

  it('renders correctly and finalizes onboarding', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: { ...mockUser, onboarding_completed: true } },
    });

    render(<FinalisePage />);
    
    expect(screen.getByText("You're all set, there!")).toBeInTheDocument();
    
    const finalizeButton = screen.getByText('Go to Dashboard');
    fireEvent.click(finalizeButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/onboarding/finalise', {});
      expect(mockSetAuth).toHaveBeenCalledWith(
        expect.objectContaining({ onboarding_completed: true }),
        expect.any(String)
      );
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
