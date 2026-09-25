import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';

export const phoneSchema = z.string().refine(
  (val) => {
    if (!val) return false;
    try {
      return isValidPhoneNumber(val);
    } catch {
      return false;
    }
  },
  { message: 'Invalid phone number for the selected country' }
);

export function getPhoneValidationError(value: string): string | null {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return null;

  try {
    const phone = parsePhoneNumberFromString(normalizedValue);
    if (!phone) return 'Invalid phone number format';
    if (!phone.isPossible()) {
      return 'Invalid phone number length for the selected country';
    }
    if (!phone.isValid()) {
      return 'Invalid phone number for the selected country';
    }
    return null;
  } catch {
    return 'Invalid phone number format';
  }
}
