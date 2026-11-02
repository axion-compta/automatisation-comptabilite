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
