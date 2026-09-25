/**
 * OAuth Error Handler Utilities
 * 
 * Converts technical OAuth error codes to user-friendly messages
 * Without leaking sensitive information
 */

export interface OAuthErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  action?: string;
  retryable: boolean;
}

/**
 * Maps OAuth error codes to user-friendly messages
 * 
 * Error codes come from backend via URL fragment:
 * #error=SECURITY_ERROR&message=You+are+logged+in+as+...
 */
export function parseOAuthError(errorCode?: string, errorMessage?: string): OAuthErrorInfo {
  // If we have a decoded message from backend, use it (already user-friendly)
  if (errorMessage) {
    // Check for email mismatch pattern
    if (errorMessage.includes('@') && (errorMessage.includes('logged in as') || errorMessage.includes('but'))) {
      // Email mismatch error - use the full message which is already clear
      return {
        code: errorCode || 'EMAIL_MISMATCH',
        message: errorMessage,
        userMessage: errorMessage, // Already user-friendly from backend
        action: 'Please logout and login with the correct email account, then try again',
        retryable: true
      };
    }
    
    // Generic security error message
    if (errorCode === 'SECURITY_ERROR') {
      return {
        code: 'SECURITY_ERROR',
        message: errorMessage,
        userMessage: errorMessage,
        action: 'Please try again or contact support if the issue persists',
        retryable: true
      };
    }
  }

  // Map technical error codes to user-friendly messages
  // Normalizing to uppercase for consistent lookup
  const normalizedCode = (errorCode || 'AUTH_FAILED').toUpperCase();

  const errorMap: { [key: string]: OAuthErrorInfo } = {
    SECURITY_ERROR: {
      code: 'SECURITY_ERROR',
      message: 'Security validation failed',
      userMessage: 'We could not complete the connection safely. This often happens if you are logged into a different Google/Microsoft account than what you use here.',
      action: 'Please try again, or logout from all your Google accounts and try linking again',
      retryable: true
    },
    UNAUTHORIZED: {
      code: 'UNAUTHORIZED',
      message: 'User not authenticated',
      userMessage: 'You are not logged in or your session has expired.',
      action: 'Please sign in to your main account again, then come back to finish connecting this tool',
      retryable: true
    },
    INVALID_STATE: {
      code: 'INVALID_STATE',
      message: 'CSRF validation failed',
      userMessage: 'Security check failed. This can happen if the page was open for too long.',
      action: 'Refresh this page and try connecting again',
      retryable: true
    },
    TOKEN_EXCHANGE_FAILED: {
      code: 'TOKEN_EXCHANGE_FAILED',
      message: 'OAuth provider connection failed',
      userMessage: 'We couldn\'t talk to the provider (Google/Microsoft). Please try again.',
      action: 'Check your internet and try again',
      retryable: true
    },
    VALIDATION_ERROR: {
      code: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      userMessage: 'The information from the provider is invalid or incomplete.',
      action: 'Try again, or use a different account',
      retryable: true
    },
    AUTH_FAILED: {
      code: 'AUTH_FAILED',
      message: 'Authentication failed',
      userMessage: 'Authentication failed. Please try again',
      action: 'Refresh and try connecting again',
      retryable: true
    }
  };

  // Return mapped error or generic message
  return (
    errorMap[normalizedCode] || {
      code: errorCode || 'UNKNOWN_ERROR',
      message: errorMessage || 'An unexpected error occurred',
      userMessage: 'We couldn\'t complete the connection. Please try again.',
      action: 'Refresh the page and try again',
      retryable: true
    }
  );
}

/**
 * Extracts email mismatch information from error message
 * Returns structured info for better error display
 */
export function extractEmailMismatchInfo(errorMessage?: string): { loggedInEmail?: string; attemptedEmail?: string } | null {
  if (!errorMessage) return null;

  // Pattern: "You are logged in as X but attempted to connect Y"
  const emailPattern = /logged in as ([^\s]+) but.*?connect ([^\s.]+)/i;
  const match = errorMessage.match(emailPattern);

  if (match) {
    return {
      loggedInEmail: match[1],
      attemptedEmail: match[2]
    };
  }

  return null;
}

/**
 * Formats error for display in UI
 * Removes technical details, adds helpful context
 */
export function formatOAuthErrorForUI(errorCode?: string, errorMessage?: string): {
  title: string;
  description: string;
  suggestion: string;
} {
  const errorInfo = parseOAuthError(errorCode, errorMessage);

  return {
    title: 'Connection Failed',
    description: errorInfo.userMessage,
    suggestion: errorInfo.action || 'Please try again or contact support'
  };
}

/**
 * Determines if error should show a "Try Again" button
 */
export function isRetryableError(errorCode?: string): boolean {
  const errorInfo = parseOAuthError(errorCode, undefined);
  return errorInfo.retryable;
}
