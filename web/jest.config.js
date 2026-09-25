/* eslint-disable @typescript-eslint/no-require-imports */
class RequestShim {}
class ResponseShim {}
class HeadersShim {}
class FormDataShim {}
class BlobShim {}
class FileShim {}

global.fetch ??= async () => {
  throw new Error('fetch is not available in the Jest bootstrap shim');
};
global.Headers ??= HeadersShim;
global.Request ??= RequestShim;
global.Response ??= ResponseShim;
global.FormData ??= FormDataShim;
global.Blob ??= BlobShim;
global.File ??= FileShim;

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
};

module.exports = createJestConfig(customJestConfig);