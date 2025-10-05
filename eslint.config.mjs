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
    },
  },
];

export default eslintConfig;
