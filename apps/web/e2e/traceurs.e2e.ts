import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const src = join(import.meta.dirname, '..', 'src');

// Les chemins viennent des modules que ecrans.ts découvre (motif lu dans ecrans.ts, non recopié).
function chemins(): string[] {
  const motif = /import\.meta\.glob[^(]*\('\.\.\/([^/]+)\/\*\/([^']+)'/.exec(readFileSync(join(src, 'socle', 'ecrans.ts'), 'utf8'));
  if (!motif) throw new Error('motif de découverte introuvable dans ecrans.ts');
  const [, dossier, fichier] = motif;
  return readdirSync(join(src, dossier!), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => /chemin:\s*'([^']+)'/.exec(readFileSync(join(src, dossier!, d.name, fichier!), 'utf8'))?.[1])
    .filter((c): c is string => c !== undefined);
}

const documente = readFileSync(join(import.meta.dirname, '..', '..', '..', 'docs', 'traceurs.md'), 'utf8')
  .split('\n')
  .filter((l) => l.startsWith('|'))
  .map((l) => l.split('|')[1]!.trim().replaceAll('`', ''));
const tailles = { bureau: { width: 1280, height: 800 }, telephone: { width: 390, height: 844 } };

test('la découverte des écrans trouve des chemins', () => {
  const liste = chemins();
  expect(liste.length).toBeGreaterThan(0);
  for (const c of liste) expect(c.startsWith('/')).toBe(true);
});

for (const [nom, taille] of Object.entries(tailles)) {
  for (const chemin of ['/', ...chemins()]) {
    test(`traceurs ${nom} ${chemin}`, async ({ page, baseURL }) => {
      await page.setViewportSize(taille);
      const externes: string[] = [];
      page.on('request', (r) => {
        const u = new URL(r.url());
        if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== new URL(baseURL!).origin) externes.push(r.url());
      });
      await page.goto(chemin);
      await page.waitForLoadState('networkidle');
      expect(externes).toEqual([]);
      expect(await page.evaluate(() => document.cookie)).toBe('');
      const cles = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
      for (const c of cles) expect(documente).toContain(c);
    });
  }
}
