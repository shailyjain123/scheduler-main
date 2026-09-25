import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignupForm } from '@/components/auth/SignupForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('SignupForm', () => {
  const mockPush = jest.fn();
  const mockSignup = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useAuth as jest.Mock).mockReturnValue({
      signup: mockSignup,
      isLoading: false,
      error: null,
    });
  });

  describe('Rendering', () => {
    it('renders signup form with title', () => {
      render(<SignupForm />);
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('renders all required input fields', () => {
      render(<SignupForm />);
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('renders terms checkbox', () => {
      render(<SignupForm />);
      expect(screen.getByLabelText(/i agree to the terms/i)).toBeInTheDocument();
    });

    it('renders login link', () => {
      render(<SignupForm />);
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    it('renders password requirements hint', () => {
      render(<SignupForm />);
      expect(
        screen.getByText(/at least 8 characters, 1 uppercase letter, 1 number/i)
      ).toBeInTheDocument();
    });
  });

  describe('Full Name Validation', () => {
    it('shows error for empty full name', async () => {
      render(<SignupForm />);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument();
      });
    });

    it('shows error for short full name', async () => {
      render(<SignupForm />);
      const fullNameInput = screen.getByLabelText(/full name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(fullNameInput, { target: { value: 'J' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Full name must be at least 2 characters')
        ).toBeInTheDocument();
      });
    });

    it('accepts valid full name', async () => {
      mockSignup.mockResolvedValue({ token: 'test-token', user: {} });

      render(<SignupForm />);
      const fullNameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the terms/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.click(termsCheckbox);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalled();
      });
    });
  });

  describe('Email Validation', () => {
    it('shows error for empty email', async () => {
      render(<SignupForm />);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format', async () => {
      render(<SignupForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Password Validation', () => {
    it('shows error for empty password', async () => {
      render(<SignupForm />);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('shows error for password too short', async () => {
      render(<SignupForm />);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(passwordInput, { target: { value: 'Short1' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters')
        ).toBeInTheDocument();
      });
    });

    it('shows error for password without uppercase letter', async () => {
      render(<SignupForm />);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(passwordInput, { target: { value: 'lowercase123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/must contain at least one uppercase letter/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error for password without number', async () => {
      render(<SignupForm />);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(passwordInput, { target: { value: 'OnlyLetters' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/must contain at least one number/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      render(<SignupForm />);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getAllByText('Passwords do not match').length).toBeGreaterThan(0);
      });
    });

    it('shows success message when passwords match', async () => {
      render(<SignupForm />);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } });

      await waitFor(() => {
        expect(screen.getByText('✓ Passwords match')).toBeInTheDocument();
      });
    });
  });

  describe('Terms Agreement', () => {
    it('shows error when terms not agreed to', async () => {
      render(<SignupForm />);
      const fullNameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('You must agree to the terms and conditions')
        ).toBeInTheDocument();
      });
    });

    it('allows submission when terms are agreed to', async () => {
      mockSignup.mockResolvedValue(true);

      render(<SignupForm />);
      const fullNameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the terms/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.click(termsCheckbox);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith(
          'John Doe',
          'test@example.com',
          'ValidPassword123'
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      mockSignup.mockResolvedValue(true);

      render(<SignupForm />);
      const fullNameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the terms/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.click(termsCheckbox);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith(
          'John Doe',
          'test@example.com',
          'ValidPassword123'
        );
      });
    });

    it('shows error message on signup failure', async () => {
      const errorMessage = 'Email already exists';
      mockSignup.mockRejectedValue(new Error(errorMessage));

      render(<SignupForm />);
      const fullNameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the terms/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.click(termsCheckbox);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('redirects to dashboard on successful signup', async () => {
      mockSignup.mockResolvedValue(true);

      render(<SignupForm />);
      const fullNameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i agree to the terms/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.click(termsCheckbox);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Loading State', () => {
    it('disables form during submission', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        signup: mockSignup,
        isLoading: true,
        error: null,
      });

      render(<SignupForm />);

      const fullNameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      const termsCheckbox = screen.getByLabelText(/i agree to the terms/i) as HTMLInputElement;

      expect(fullNameInput.disabled).toBe(true);
      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(termsCheckbox.disabled).toBe(true);
    });

    it('shows loading spinner during submission', () => {
      (useAuth as jest.Mock).mockReturnValue({
        signup: mockSignup,
        isLoading: true,
        error: null,
      });

      render(<SignupForm />);
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    });
  });
});
