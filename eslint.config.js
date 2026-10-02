import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    '05_Production_Builds',
    '07_System_Snapshots',
    '10_Engineering_Config',
    '**/_archive',
    '**/coverage',
    'public',
    '04_Digital_Assets',
    '01_Design_Brand',
    'test-results',
    'playwright-report',
  ]),
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
    },
  },
  {
    // shadcn/ui primitives export variants next to components (upstream pattern)
    files: ['02_Application_Source/components/ui/**/*.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Node-side automation scripts, tests and tool configs
    files: ['03_Automation_System/**/*.js', 'tests/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
])
