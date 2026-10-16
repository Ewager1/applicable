import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

const readonly = names => Object.fromEntries(names.map(name => [name, 'readonly']));

export default [
  { ignores: ['dist/**', 'node_modules/**', 'output/**', 'tmp/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: { eqeqeq: 'error', 'no-eval': 'error' },
  },
  {
    files: ['app/**/*.js', 'proof/browser.mjs'],
    languageOptions: { globals: readonly(['window', 'document', 'fetch', 'URL', 'Blob', 'btoa', 'console', 'navigator']) },
  },
  {
    files: ['**/*.test.mjs', 'tests/**/*.mjs', 'proof/pdf.mjs', 'proof/generate.mjs', 'proof/serve.mjs', 'proof/production-fixtures.mjs', 'scripts/**/*.mjs'],
    languageOptions: { globals: readonly(['process', 'Buffer', 'console', 'URL', 'fetch', 'setTimeout', 'clearTimeout', 'structuredClone']) },
  },
  {
    files: ['app/**/*.ts', 'app/**/*.tsx'],
    languageOptions: { parser: tsParser, globals: readonly(['URL', 'fetch', 'btoa', 'Uint8Array']) },
    // TypeScript checks names and unused declarations, including type-only imports.
    rules: { 'no-undef': 'off', 'no-unused-vars': 'off', eqeqeq: 'error', 'no-eval': 'error' },
  },
  {
    files: ['**/*.test.mjs'],
    // Browser callbacks are serialized by Playwright and execute in the page.
    languageOptions: { globals: readonly(['document', 'fetch', 'window', 'navigator']) },
  },
];
