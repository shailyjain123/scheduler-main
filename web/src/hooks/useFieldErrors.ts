import { useState, useCallback } from 'react';
import { ApiResponse } from '../lib/api/client';
import { extractFieldErrors } from '../lib/apiErrors';

export function useFieldErrors<T extends object>(initialState: Partial<Record<keyof T, string>> = {}) {
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof T, string>>>(initialState);

  // Clear specific field
  const clearFieldError = useCallback((field: keyof T) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  }, []);

  // Set specific field
  const setFieldError = useCallback((field: keyof T, error: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  // Merge client errors manually
  const mergeFieldErrors = useCallback((errors: Partial<Record<keyof T, string>>) => {
    setFieldErrors(prev => ({ ...prev, ...errors }));
  }, []);

  // Directly parse and map an API response to state
  const captureApiErrors = useCallback((response: ApiResponse) => {
    if (response.success) {
      setFieldErrors({});
      return;
    }
    const apiMapped = extractFieldErrors(response) as Partial<Record<keyof T, string>>;
    setFieldErrors(apiMapped);
  }, []);

  return {
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    setFieldError,
    mergeFieldErrors,
    captureApiErrors
  };
}
