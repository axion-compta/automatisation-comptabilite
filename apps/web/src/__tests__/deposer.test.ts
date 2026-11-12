// @vitest-environment jsdom
// Fiche L04-T42 : api.deposer (lots de 20, clé d'idempotence).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deposer } from '../api.js';

const pdf = (n: number): File => new File(['%PDF-1.4 fictif ' + n], 'piece-' + n + '.pdf', { type: 'application/pdf' });
const fichiers = (n: number): File[] => Array.from({ length: n }, (_, i) => pdf(i));

type Appel = { cle: string; nb: number };
function simuler(): Appel[] {
  const appels: Appel[] = [];
  vi.stubGlobal('fetch', async (_u: string, o: RequestInit) => {
    const nb = (o.body as FormData).getAll('fichiers').length;
    appels.push({ cle: new Headers(o.headers).get('idempotency-key') ?? '', nb });
    return Response.json({ body: { resultats: Array.from({ length: nb }, (_, i) => ({ statut: 'recue', id: 'p-' + i })) } });
  });
  return appels;
}
afterEach(() => vi.unstubAllGlobals());

describe('deposer', () => {
  it('deposer-un-lot-par-20', async () => {
    const appels = simuler();
    const res = await deposer(fichiers(45), 'selecteur');
    expect(appels.map((a) => a.nb)).toEqual([20, 20, 5]);
    expect(res).toHaveLength(45);
  });
  it('cle-idempotence-stable', async () => {
    const appels = simuler();
    await deposer(fichiers(3), 'glisser');
    await deposer(fichiers(3), 'selecteur');
    await deposer(fichiers(2), 'glisser');
    expect(appels[0]?.cle).toMatch(/^[0-9a-f]{64}$/);
    expect(appels[1]?.cle).toBe(appels[0]?.cle);
    expect(appels[2]?.cle).not.toBe(appels[0]?.cle);
  });
  it('reponse-incomplete-refusee', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ body: { resultats: [] } }));
    await expect(deposer(fichiers(2), 'glisser')).rejects.toMatchObject({ code: 'reponse_invalide' });
  });
  it('reseau-coupe', async () => {
    vi.stubGlobal('fetch', async () => Promise.reject(new Error('coupé')));
    await expect(deposer(fichiers(1), 'glisser')).rejects.toMatchObject({ statut: 0, code: 'reseau' });
  });
});
