// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        // Generated and vendored output is not linted.
        ignores: ['out/**', 'dist/**', 'node_modules/**', '.vscode-test/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        rules: {
            eqeqeq: ['error', 'always'],
            curly: 'error',
            semi: ['error', 'always'],
            'no-throw-literal': 'error',
            // Prefer const, but don't fail the build on a stylistic `let`.
            'prefer-const': 'warn',
        },
    },
);
