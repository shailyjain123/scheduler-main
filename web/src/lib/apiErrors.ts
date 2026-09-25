import { ApiResponse } from './api/client';

export function extractFieldErrors(response: ApiResponse | null | undefined): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (!response || !response.error?.details) {
    return errors;
  }

  const { details } = response.error;
  
  Object.keys(details).forEach(key => {
    const value = details[key];
    if (Array.isArray(value) && value.length > 0) {
      const messages = value.map(msg => typeof msg === 'string' ? msg : JSON.stringify(msg));
      
      const humanKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      // Special case handling for custom formatting or specific fields
      errors[key] = `${humanKey} ${messages.join(' and ')}`;
    } else if (typeof value === 'string') {
      errors[key] = value;
    }
  });

  return errors;
}

export function hasFieldErrors(response: ApiResponse | null | undefined): boolean {
  if (!response || !response.error?.details) return false;
  return Object.keys(response.error.details).length > 0;
}
