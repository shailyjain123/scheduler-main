import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePage from '@/app/onboarding/profile/page';
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

describe('ProfilePage', () => {
  const mockPush = jest.fn();
  const mockSetAuth = jest.fn();
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    username: 'test_user',
    onboarding_stage: 1,
    onboarding_completed: false,
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

  it('renders correctly with initial data', () => {
    render(<ProfilePage />);
    
    expect(screen.getByText('Profile setup')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Alex Rivers')).toHaveValue('Test User');
    expect(screen.getByPlaceholderText('alex_rivers')).toHaveValue('test_user');
    expect(screen.getByText('Individual')).toBeInTheDocument();
  });

  it('updates form data and submits successfully', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: { ...mockUser, onboarding_stage: 2 } },
    });

    render(<ProfilePage />);

    const nameInput = screen.getByPlaceholderText('Alex Rivers');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

    const usernameInput = screen.getByPlaceholderText('alex_rivers');
    fireEvent.change(usernameInput, { target: { value: 'jane_doe' } });

    const enterpriseOption = screen.getByText('Enterprise');
    fireEvent.click(enterpriseOption);

    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/onboarding/profile', expect.objectContaining({
        full_name: 'Jane Doe',
        username: 'jane_doe',
        work_type: 'Enterprise',
      }));
      expect(mockPush).toHaveBeenCalledWith('/onboarding/integrations');
    });
  });

  it('handles API errors correctly', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: false,
      error: { message: 'Username already taken' },
    });

    render(<ProfilePage />);

    const nameInput = screen.getByPlaceholderText('Alex Rivers');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    const usernameInput = screen.getByPlaceholderText('alex_rivers');
    fireEvent.change(usernameInput, { target: { value: 'taken_user' } });

    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username already taken')).toBeInTheDocument();
    });
  });

  it('shows error if name or username is missing', async () => {
    render(<ProfilePage />);
    
    // Clear inputs manually to bypass initial mock data
    const nameInput = screen.getByPlaceholderText('Alex Rivers');
    fireEvent.change(nameInput, { target: { value: '' } });
    const usernameInput = screen.getByPlaceholderText('alex_rivers');
    fireEvent.change(usernameInput, { target: { value: '' } });

    const submitForm = screen.getByRole('button', { name: /continue/i });
    fireEvent.submit(submitForm.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Please fix the highlighted fields before continuing/i)).toBeInTheDocument();
    });
    
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
