import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// Une capture PNG par écran découvert (dossier avec route.tsx) et par largeur.
const LARGEURS = [1280, 390];
const HAUTEUR = 800;
const INSTANT_FIGE = new Date('2026-11-11T09:00:00Z');
const RACINE_ECRANS = fileURLToPath(new URL('../src/ecrans', import.meta.url));
const SORTIE = resolve(process.env['CAPTURES_DIR'] ?? 'captures');

function ecransDecouverts(): Array<{ id: string; chemin: string }> {
  return readdirSync(RACINE_ECRANS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(RACINE_ECRANS, d.name, 'route.tsx')))
    .map((d) => {
      const chemin = /chemin:\s*'([^']+)'/.exec(readFileSync(join(RACINE_ECRANS, d.name, 'route.tsx'), 'utf8'))?.[1];
      if (!chemin) throw new Error('chemin introuvable pour l’écran ' + d.name);
      return { id: d.name, chemin };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

const COUPE_ANIMATIONS = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}';

test.beforeAll(() => mkdirSync(SORTIE, { recursive: true }));

for (const ecran of ecransDecouverts()) {
  for (const largeur of LARGEURS) {
    test(`capture ${ecran.id} ${largeur}`, async ({ page }) => {
      // Polices locales seulement : toute requête hors du serveur local est refusée.
      await page.route(/^(?!http:\/\/127\.0\.0\.1:5173|data:|blob:)/, (r) => r.abort());
      await page.clock.install({ time: INSTANT_FIGE });
      await page.setViewportSize({ width: largeur, height: HAUTEUR });
      await page.goto(ecran.chemin);
      await page.addStyleTag({ content: COUPE_ANIMATIONS });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible();
      await page.screenshot({ path: join(SORTIE, `${ecran.id}-${largeur}.png`), fullPage: true, animations: 'disabled', caret: 'hide' });
    });
  }
}
