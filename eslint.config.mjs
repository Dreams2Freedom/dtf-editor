import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Relax non-critical rules for better DX
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_', // Allow _variable for intentionally unused
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error
      'react/no-unescaped-entities': 'off', // Allow apostrophes/quotes in JSX
      'react-hooks/exhaustive-deps': 'warn', // Important - keep as warning
      '@next/next/no-img-element': 'warn', // Warn about img tags instead of error

      // Phase 2.0: enforce Studio plugin isolation. A tool's folder may
      // not import from another tool's folder. Cross-tool sharing only
      // flows through src/components/, src/hooks/, src/services/, etc.
      // The shared plugin contract under src/tools/{types,registry}.ts
      // is exempt — that's the public surface.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/tools/bg-removal*', '@/tools/bg-removal/*'],
              message:
                'Cross-tool import not allowed. Tool folders are firewalled — share via src/components, src/hooks, or src/services.',
            },
            {
              group: ['@/tools/upscale*', '@/tools/upscale/*'],
              message:
                'Cross-tool import not allowed. Tool folders are firewalled — share via src/components, src/hooks, or src/services.',
            },
            {
              group: ['@/tools/color-change*', '@/tools/color-change/*'],
              message:
                'Cross-tool import not allowed. Tool folders are firewalled — share via src/components, src/hooks, or src/services.',
            },
            {
              group: ['@/tools/vectorize*', '@/tools/vectorize/*'],
              message:
                'Cross-tool import not allowed. Tool folders are firewalled — share via src/components, src/hooks, or src/services.',
            },
          ],
        },
      ],
    },
  },
  // Per-tool overrides: each tool may import from its own folder, and any
  // file may import the shared contract (src/tools/{types,registry}.ts).
  {
    files: ['src/tools/bg-removal/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/tools/upscale*', '@/tools/upscale/*'],
              message: 'Cross-tool import not allowed.',
            },
            {
              group: ['@/tools/color-change*', '@/tools/color-change/*'],
              message: 'Cross-tool import not allowed.',
            },
            {
              group: ['@/tools/vectorize*', '@/tools/vectorize/*'],
              message: 'Cross-tool import not allowed.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/tools/upscale/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/tools/bg-removal*', '@/tools/bg-removal/*'],
              message: 'Cross-tool import not allowed.',
            },
            {
              group: ['@/tools/color-change*', '@/tools/color-change/*'],
              message: 'Cross-tool import not allowed.',
            },
            {
              group: ['@/tools/vectorize*', '@/tools/vectorize/*'],
              message: 'Cross-tool import not allowed.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/tools/color-change/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/tools/bg-removal*', '@/tools/bg-removal/*'],
              message: 'Cross-tool import not allowed.',
            },
            {
              group: ['@/tools/upscale*', '@/tools/upscale/*'],
              message: 'Cross-tool import not allowed.',
            },
            {
              group: ['@/tools/vectorize*', '@/tools/vectorize/*'],
              message: 'Cross-tool import not allowed.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/tools/vectorize/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/tools/bg-removal*', '@/tools/bg-removal/*'],
              message: 'Cross-tool import not allowed.',
            },
            {
              group: ['@/tools/upscale*', '@/tools/upscale/*'],
              message: 'Cross-tool import not allowed.',
            },
            {
              group: ['@/tools/color-change*', '@/tools/color-change/*'],
              message: 'Cross-tool import not allowed.',
            },
          ],
        },
      ],
    },
  },
  // Studio shell + standalone routes + the registry are allowed to import
  // from any tool — they're the integration layer.
  {
    files: [
      'src/app/studio/**/*.{ts,tsx}',
      'src/app/process/**/*.{ts,tsx}',
      'src/app/api/**/*.{ts,tsx}',
      'src/tools/registry.ts',
      'src/tools/types.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];

export default eslintConfig;
