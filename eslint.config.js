import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/.stryker-tmp/**', '**/reports/**', '**/playwright-report/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{mjs,js}'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', URL: 'readonly' },
    },
  },
  {
    // Noyau argent : centimes entiers, aucun flottant (V3-PRI-014).
    files: ['packages/noyau/src/**/*.ts'],
    ignores: ['packages/noyau/src/**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'Literal[raw=/^[0-9_]*\\.[0-9]/]', message: 'Littéral décimal interdit dans le noyau : utiliser des centimes entiers.' },
        { selector: 'Literal[raw=/^[0-9_.]+[eE]-/]', message: 'Exposant négatif interdit dans le noyau : utiliser des centimes entiers.' },
        { selector: "CallExpression[callee.name='parseFloat']", message: 'parseFloat interdit dans le noyau.' },
        { selector: "CallExpression[callee.property.name='toFixed']", message: 'toFixed interdit dans le noyau.' },
        { selector: "MemberExpression[object.name='Math'][property.name=/^(round|random|fround)$/]", message: 'Math.round/random/fround interdits dans le noyau : arrondi explicite via Arrondi.' },
      ],
    },
  },
);
