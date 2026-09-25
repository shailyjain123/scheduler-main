/**
 * Centralized Email Validation System
 * 
 * Rules:
 * 1. Basic format via robust regex
 * 2. Domain must contain at least one dot
 * 3. TLD must be at least 2 characters
 * 4. Checks against blocked/disposable domains
 */

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

const BLOCKED_DOMAINS = [
  'mailinator.com',
  '10minutemail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'yopmail.com',
  'dispostable.com',
  'trashmail.com'
];

// Robust email regex that covers 99.9% of real-world cases
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email: string): EmailValidationResult {
  const normalized = (email || '').trim().toLowerCase();

  if (!normalized) {
    return { isValid: false, error: 'Email is required' };
  }

  // 1. Basic Regex Format Check
  if (!EMAIL_REGEX.test(normalized)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  const [localPart, domain] = normalized.split('@');

  // 2. Domain Structure Checks
  if (!domain || !domain.includes('.')) {
    return { isValid: false, error: 'Invalid email format' };
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  // 3. TLD Length Check
  if (!tld || tld.length < 2) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // 4. Blocked Domain Check
  if (BLOCKED_DOMAINS.includes(domain)) {
    return { isValid: false, error: 'Email domain is not allowed' };
  }

  return { isValid: true };
}
