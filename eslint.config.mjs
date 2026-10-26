import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'reports/**', 'node_modules/**'] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
    },
  },
);
