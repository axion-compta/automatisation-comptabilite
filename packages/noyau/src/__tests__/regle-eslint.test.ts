import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const racine = fileURLToPath(new URL('../../../../', import.meta.url));

async function verifier(code: string, fichier = 'packages/noyau/src/exemple.ts') {
  const eslint = new ESLint({ cwd: racine });
  const [res] = await eslint.lintText(code, { filePath: racine + fichier });
  return (res?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-syntax');
}

describe('règle eslint « pas de flottant » (test rouge)', () => {
  it.each([
    ['littéral décimal', 'export const a = 0.1;'],
    ['littéral décimal sans partie entière', 'export const a = .5;'],
    ['notation exponentielle négative', 'export const a = 1e-3;'],
    ['parseFloat', 'export const a = parseFloat("1");'],
    ['toFixed', 'export const a = (1).toFixed(2);'],
    ['Math.round', 'export const a = Math.round(1);'],
    ['division', 'export const a = (1 as number) / 2;'],
    ['division affectée', 'let a = 4; a /= 2; export { a };'],
    ['division bigint', 'export const a = 4n / 2n;'],
    ['Number.parseFloat', 'export const a = Number.parseFloat("1");'],
    ['Math.random', 'export const a = Math.random();'],
  ])('refuse : %s', async (_nom, code) => {
    expect((await verifier(code)).length).toBeGreaterThan(0);
  });

  it('accepte le code entier', async () => {
    expect(await verifier('export const a = 10 + 2 ** 3; export const b = "0.1";')).toEqual([]);
  });

  it('ne s’applique pas hors du noyau', async () => {
    expect(await verifier('export const a = 0.1;', 'packages/ui/src/exemple.ts')).toEqual([]);
  });
});

describe('exception de division verrouillée', () => {
  function sources(dossier: string): string[] {
    return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
      const chemin = dossier + '/' + e.name;
      if (e.isDirectory()) return e.name === '__tests__' ? [] : sources(chemin);
      return e.name.endsWith('.ts') ? [chemin] : [];
    });
  }

  it('un seul eslint-disable dans le noyau, juste avant la division de diviser', () => {
    const trouves: { fichier: string; suivante: string }[] = [];
    for (const fichier of sources(racine + 'packages/noyau/src')) {
      const lignes = readFileSync(fichier, 'utf8').split(/\r?\n/);
      lignes.forEach((l, i) => {
        if (l.includes('eslint-disable')) {
          trouves.push({ fichier: fichier.replace(racine, ''), suivante: (lignes[i + 1] ?? '').trim() });
        }
      });
    }
    expect(trouves).toEqual([
      { fichier: 'packages/noyau/src/argent/index.ts', suivante: 'let q = numerateur / denominateur;' },
    ]);
  });
});
