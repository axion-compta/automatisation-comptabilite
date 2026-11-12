import { defineConfig, devices } from '@playwright/test';

// Chaîne de captures déterministe (V3-DEM-014) : Chromium seul, échelle 1, fuseau et langue fixés, un seul travailleur.
// Le dossier de sortie vient de CAPTURES_DIR ; lancée par outils/captures/lancer.mjs dans l'image épinglée.
export default defineConfig({
  testDir: './e2e-captures',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  retries: 0,
  fullyParallel: false,
  outputDir: (process.env['CAPTURES_DIR'] ?? 'captures') + '/.rapport',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'fr-FR',
    timezoneId: 'UTC',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 } }],
  webServer: { command: 'pnpm run dev:simule', url: 'http://127.0.0.1:5173', reuseExistingServer: false, timeout: 60_000 },
});
