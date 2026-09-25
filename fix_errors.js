const fs = require('fs');
const glob = require('glob');

// 1. Fix test files
const testFiles = fs.readdirSync('src/__tests__/onboarding/');
for (const file of testFiles) {
  if (file.endsWith('.test.tsx')) {
    const filePath = `src/__tests__/onboarding/${file}`;
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\(useRouter as any\)/g, '(useRouter as jest.Mock)');
    content = content.replace(/\(useAuthStore as any\)/g, '(useAuthStore as unknown as jest.Mock)');
    fs.writeFileSync(filePath, content);
  }
}

// 2. Fix LoginForm.test.tsx
let loginFormTest = fs.readFileSync('src/components/auth/__tests__/LoginForm.test.tsx', 'utf8');
loginFormTest = loginFormTest.replace(/import userEvent from '@testing-library\/user-event';\n?/, '');
loginFormTest = loginFormTest.replace(/let resolveLogin: any;\n?/, 'let resolveLogin: (value: unknown) => void;\nresolveLogin = jest.fn();\n');
loginFormTest = loginFormTest.replace(/resolveLogin = resolve;/, 'resolveLogin = resolve as (value: unknown) => void;');
// Also check if userEvent is imported without line break... actually just remove userEvent from import
loginFormTest = loginFormTest.replace(/.*userEvent.*\n?/, ''); 
fs.writeFileSync('src/components/auth/__tests__/LoginForm.test.tsx', loginFormTest);

// 3. Fix SignupForm.test.tsx
let signupFormTest = fs.readFileSync('src/components/auth/__tests__/SignupForm.test.tsx', 'utf8');
signupFormTest = signupFormTest.replace(/.*userEvent.*\n?/, '');
fs.writeFileSync('src/components/auth/__tests__/SignupForm.test.tsx', signupFormTest);

// 4. Fix jest.config.js
let jestConfig = fs.readFileSync('jest.config.js', 'utf8');
if (!jestConfig.includes('eslint-disable-next-line')) {
  jestConfig = '// eslint-disable-next-line @typescript-eslint/no-require-imports\n' + jestConfig;
  fs.writeFileSync('jest.config.js', jestConfig);
}

// 5. Fix layout.tsx
let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
if (!layout.includes('eslint-disable-next-line @next/next/no-page-custom-font')) {
  layout = layout.replace('<head>', '<head>\n        {/* eslint-disable-next-line @next/next/no-page-custom-font */}');
  fs.writeFileSync('src/app/layout.tsx', layout);
}

