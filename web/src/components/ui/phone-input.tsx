'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import PhoneInput from 'react-phone-number-input';
import { parsePhoneNumberFromString, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import 'react-phone-number-input/style.css';
import { forwardRef } from 'react';

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
}

const PhoneInputField = forwardRef<HTMLInputElement, PhoneInputFieldProps>(
  ({ value, onChange, onBlur, error, disabled }, ref) => {
    const [country, setCountry] = useState<string>('IN');
    const lastValidCountryRef = useRef<string>('IN');

    // Create calling code map once (memoized)
    const countryByCallingCode = useMemo(() => {
      const map: Record<string, string> = {};
      getCountries().forEach(code => {
        const callingCode = getCountryCallingCode(code);
        map[`+${callingCode}`] = code;
      });
      return map;
    }, []);

    // Extract country from partial or complete phone value
    const extractCountry = useCallback((phoneValue: string): string | null => {
      if (!phoneValue) return null;

      // Try parsing as complete phone number first
      const parsed = parsePhoneNumberFromString(phoneValue);
      if (parsed?.country) {
        return parsed.country;
      }

      // If incomplete, try to extract from the calling code prefix
      // Match patterns like "+1", "+44", "+91", etc.
      const match = phoneValue.match(/^\+(\d{1,3})/);
      if (match) {
        const callingCodeKey = `+${match[1]}`;
        return countryByCallingCode[callingCodeKey] || null;
      }

      return null;
    }, [countryByCallingCode]);

    // Update country whenever value changes, but preserve last valid country
    useEffect(() => {
      if (!value) {
        // Don't reset country - keep the last selected one
        return;
      }

      const extractedCountry = extractCountry(value);
      if (extractedCountry) {
        setCountry(extractedCountry);
        lastValidCountryRef.current = extractedCountry;
      }
    }, [value, extractCountry]);

    const handleChange = (val: string | undefined) => {
      // Always preserve the last valid country even when input is cleared
      if (val) {
        const extractedCountry = extractCountry(val);
        if (extractedCountry) {
          setCountry(extractedCountry);
          lastValidCountryRef.current = extractedCountry;
        }
      }

      // Send the change to parent (can be empty string)
      onChange(val ?? '');
    };

    return (
      <div className="space-y-1.5">
        <PhoneInput
          international
          country={country}
          onCountryChange={(newCountry) => {
            if (newCountry) {
              setCountry(newCountry);
              lastValidCountryRef.current = newCountry;
            }
          }}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          inputRef={ref}
          className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-transparent focus-within:border-[#5C6EFF]/40 focus-within:ring-4 focus-within:ring-[#5C6EFF]/5 focus-within:bg-white transition-all text-sm font-bold cursor-pointer"
          numberInputProps={{
            className: 'bg-transparent outline-none w-full text-sm font-bold placeholder:text-slate-300',
            placeholder: 'Enter phone number',
            inputMode: 'tel',
            autoComplete: 'tel',
          }}
        />
        {error && <p className="text-[11px] text-[#ba1a1a]">{error}</p>}
      </div>
    );
  }
);

PhoneInputField.displayName = 'PhoneInputField';
export default PhoneInputField;
