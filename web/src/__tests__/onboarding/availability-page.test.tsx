import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AvailabilityPage from '@/app/onboarding/availability/page';
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

describe('AvailabilityPage', () => {
  const mockPush = jest.fn();
  const mockSetAuth = jest.fn();
  const mockUser = {
    id: 1,
    onboarding_stage: 3,
    availability: null
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

  it('renders correctly and updates availability', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: { ...mockUser, onboarding_stage: 4 } },
    });

    render(<AvailabilityPage />);
    
    expect(screen.getByText('Set your availability')).toBeInTheDocument();
    
    // Toggle Saturday (disabled by default)
    // In the new UI, days are full names like "Saturday"
    const satText = screen.getByText('Saturday');
    const satBtn = satText.previousElementSibling as HTMLButtonElement;
    fireEvent.click(satBtn);

    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/onboarding/availability', {
        availability: expect.objectContaining({
          'Saturday': expect.arrayContaining([
            expect.objectContaining({ start: '09:00', end: '10:00' })
          ])
        })
      });
      expect(mockPush).toHaveBeenCalledWith('/onboarding/meeting-types');
    });
  });

  it('adds and removes slots', async () => {
    render(<AvailabilityPage />);

    const initialRemoveButtons = screen.getAllByTitle('Remove this shift');
    expect(initialRemoveButtons.length).toBe(5);

    // Click first day's "ADD SHIFT" button
    const addBtn = screen.getAllByText('ADD SHIFT')[0];
    fireEvent.click(addBtn);

    // One extra slot row should appear
    expect(screen.getAllByTitle('Remove this shift').length).toBe(6);

    // Remove one
    const removeBtns = screen.getAllByTitle('Remove this shift');
    fireEvent.click(removeBtns[0]);

    expect(screen.getAllByTitle('Remove this shift').length).toBe(5);
  });

  it('shows inline error and disables continue for invalid range in real time', async () => {
    render(<AvailabilityPage />);

    const timeInputs = screen.getAllByDisplayValue('09:00') as HTMLInputElement[];
    const firstStartInput = timeInputs[0];

    const endInputs = screen.getAllByDisplayValue('17:00') as HTMLInputElement[];
    const firstEndInput = endInputs[0];

    fireEvent.change(firstStartInput, { target: { value: '10:00' } });
    fireEvent.change(firstEndInput, { target: { value: '09:30' } });

    expect(await screen.findByText('End time must be later than start time.')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeDisabled();
  });

  it('detects overlapping slots and allows applying suggested fix', async () => {
    render(<AvailabilityPage />);

    const addButtons = screen.getAllByText('ADD SHIFT');
    fireEvent.click(addButtons[0]);

    const startInputs = screen.getAllByDisplayValue('09:00') as HTMLInputElement[];
    const endInputs = screen.getAllByDisplayValue('10:00') as HTMLInputElement[];

    // The newly added Monday slot defaults to 17:00-18:00, force overlap with Monday 09:00-17:00.
    const overlappingStart = startInputs[1];
    const overlappingEnd = endInputs[0];
    fireEvent.change(overlappingStart, { target: { value: '16:30' } });
    fireEvent.change(overlappingEnd, { target: { value: '17:30' } });

    expect(await screen.findByText(/Overlaps with/)).toBeInTheDocument();

    const applyButton = screen.getByRole('button', { name: /Apply/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.queryByText(/Overlaps with/)).not.toBeInTheDocument();
    });
  });
});
