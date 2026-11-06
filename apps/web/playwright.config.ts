import { defineConfig, devices } from '@playwright/test';

// Chromium seul. Le mode simulé sert le faux serveur MSW dans le navigateur.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  use: { baseURL: 'http://127.0.0.1:5173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'pnpm run dev:simule', url: 'http://127.0.0.1:5173', reuseExistingServer: false, timeout: 60_000 },
});
