import { validatePhoneNumberLength, getCountryCallingCode, CountryCode } from 'libphonenumber-js';

function getPhoneMaxLength(countryCode: CountryCode): number {
  try {
    const dialCode = `+${getCountryCallingCode(countryCode)}`;
    for (let len = 15; len >= 5; len--) {
      const testNum = dialCode + '9'.repeat(len);
      const result = validatePhoneNumberLength(testNum, countryCode);
      console.log(`Testing ${countryCode} length ${len}: ${result}`);
      if (result !== 'TOO_LONG') {
        return len;
      }
    }
  } catch (error) {
    console.error(error);
  }
  return 15;
}

console.log('Max length for IN:', getPhoneMaxLength('IN'));
console.log('Max length for US:', getPhoneMaxLength('US'));
