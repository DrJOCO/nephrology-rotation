import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'

// PR 3.2: ban the legacy palette tokens that were retired in favor of
// brand / success / warning / danger / info. Catches reintroductions in PR review.
// Exact-match list rather than a prefix regex so we don't false-flag T.warning, T.warningBg, etc.
const LEGACY_TOKENS = [
  'accent', 'redBg', 'redAlpha', 'redDeep',
  'green', 'greenBg', 'greenDk', 'greenAlpha',
  'gold', 'goldText', 'goldAlpha', 'goldAlphaMd', 'yellowBg',
  'warn', 'orange',
  'purple', 'purpleBg', 'purpleAccent', 'purpleSoft',
  'sky', 'blue', 'blueBg', 'blueDk',
]
const noLegacyPaletteRule = {
  selector: `MemberExpression[object.name="T"][property.name=/^(${LEGACY_TOKENS.join('|')})$/]`,
  message: 'Legacy palette token retired in PR 3.2. Use T.brand / T.success / T.warning / T.danger / T.info instead.',
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'no-restricted-syntax': ['error', noLegacyPaletteRule],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-restricted-syntax': ['error', noLegacyPaletteRule],
    },
  },
])
