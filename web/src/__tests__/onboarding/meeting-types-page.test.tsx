import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MeetingTypesPage from '@/app/onboarding/meeting-types/page';
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

describe('MeetingTypesPage', () => {
  const mockPush = jest.fn();
  const mockSetAuth = jest.fn();
  const mockUser = {
    id: 1,
    onboarding_stage: 4,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: { event_types: [] },
    });
    (useOnboardingProtection as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthorized: true,
    });
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: mockUser,
      setAuth: mockSetAuth,
    });
  });

  it('renders correctly and toggles event types', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: { ...mockUser, onboarding_stage: 5 } },
    });

    render(<MeetingTypesPage />);
    
    expect(screen.getByText('Choose your meeting types')).toBeInTheDocument();
    
    // Toggle Group Session (inactive by default)
    const groupBtn = screen.getByText('Group Session');
    fireEvent.click(groupBtn);

    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/onboarding/meeting-types', {
        selected_types: expect.arrayContaining(['one-on-one', 'group-session'])
      });
      expect(mockPush).toHaveBeenCalledWith('/onboarding/finalise');
    });
  });

  it('shows inline error in real time when custom Event Title is too short', async () => {
    render(<MeetingTypesPage />);

    fireEvent.click(screen.getByText('Custom'));
    const titleInput = await screen.findByPlaceholderText('e.g. Virtual Coffee Chat');

    fireEvent.change(titleInput, { target: { value: 'Hi' } });

    expect(await screen.findByText('Event Title must be at least 3 characters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Configuration' })).toBeDisabled();
  });

  it('blocks submission when custom Event Title exceeds max length', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });

    render(<MeetingTypesPage />);

    fireEvent.click(screen.getByText('Custom'));
    const titleInput = await screen.findByPlaceholderText('e.g. Virtual Coffee Chat');
    fireEvent.change(titleInput, { target: { value: 'A'.repeat(21) } });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText('Please fix the Event Title field before continuing.')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
