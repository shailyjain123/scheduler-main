import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('LoginForm', () => {
  const mockPush = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
    });
  });

  describe('Rendering', () => {
    it('renders login form with title', () => {
      render(<LoginForm />);
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('renders email and password input fields', () => {
      render(<LoginForm />);
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<LoginForm />);
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders signup link', () => {
      render(<LoginForm />);
      expect(screen.getByText(/create one/i)).toBeInTheDocument();
    });

    it('renders password visibility toggle button', () => {
      render(<LoginForm />);
      const toggleButtons = screen.getAllByRole('button').filter(
        (btn) => btn.getAttribute('type') === 'button'
      );
      expect(toggleButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('shows validation error for empty email', async () => {
      render(<LoginForm />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid email', async () => {
      render(<LoginForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address')
        ).toBeInTheDocument();
      });
    });

    it('shows validation error for empty password', async () => {
      render(<LoginForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('shows validation error for short password', async () => {
      render(<LoginForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters')
        ).toBeInTheDocument();
      });
    });

    it('clears validation errors when user types', async () => {
      render(<LoginForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid credentials', async () => {
      mockLogin.mockResolvedValue(true);

      render(<LoginForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'ValidPassword123');
      });
    });

    it('prevents submission with invalid data', async () => {
      render(<LoginForm />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
      });
    });

    it('shows error message on login failure', async () => {
      const errorMessage = 'Email or password is incorrect';
      mockLogin.mockRejectedValue(new Error(errorMessage));

      render(<LoginForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('redirects to dashboard on successful login', async () => {
      mockLogin.mockResolvedValue(true);

      render(<LoginForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Loading State', () => {
    it('disables button and shows loading text during submission', async () => {
      const loginPromise = new Promise(() => {});
      mockLogin.mockReturnValue(loginPromise);

      const { rerender } = render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });

      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
      });

      fireEvent.click(submitButton);

      rerender(<LoginForm />);

      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      });
    });

    it('shows spinner during loading', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
      });

      render(<LoginForm />);

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });

    it('disables inputs during loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;

      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility', async () => {
      render(<LoginForm />);
      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      const toggleButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('👁')
      );

      expect(passwordInput.type).toBe('password');

      if (toggleButton) {
        fireEvent.click(toggleButton);
        expect(passwordInput.type).toBe('text');

        fireEvent.click(toggleButton);
        expect(passwordInput.type).toBe('password');
      }
    });
  });
});
