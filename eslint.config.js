import js from '@eslint/js';

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
    languageOptions: { globals: readonly(['window', 'document', 'fetch', 'URL', 'Blob', 'btoa', 'console']) },
  },
  {
    files: ['**/*.test.mjs', 'tests/**/*.mjs', 'proof/pdf.mjs', 'proof/generate.mjs', 'proof/serve.mjs'],
    languageOptions: { globals: readonly(['process', 'Buffer', 'console', 'URL', 'fetch', 'setTimeout', 'clearTimeout']) },
  },
  {
    files: ['**/*.test.mjs'],
    // Browser callbacks are serialized by Playwright and execute in the page.
    languageOptions: { globals: readonly(['document', 'fetch']) },
  },
];
