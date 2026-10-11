import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default ts.config(
  { ignores: ['**/.next/**', '**/next-env.d.ts', '.cache/**', 'coverage/**', 'test-results/**', 'playwright-report/**'] },
  { files: ['**/*.ts', '**/*.tsx'], extends: [js.configs.recommended, ...ts.configs.recommended], plugins: { 'react-hooks': hooks }, rules: { ...hooks.configs.recommended.rules } }
);
