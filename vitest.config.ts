import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // outils/gardes/test est lancé par `node --test` (pnpm tests:gardes), pas par vitest.
  test: { exclude: [...configDefaults.exclude, 'outils/gardes/test/**'] },
});
