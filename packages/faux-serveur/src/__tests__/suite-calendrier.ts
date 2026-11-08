import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

type Lignes = Array<{ id: string; dateLimite?: string; statut: string; aVerifier: boolean; sourceUrl?: string }>;
type Termes = Array<{ code: string; mot: string; survol?: string }>;
const PLAGE = '?du=2026-01-01&au=2027-12-31';
const CAL = '/exercices/EX2026/calendrier';

/** Suite commune « calendrier et vocabulaire » : jouée sur le vrai serveur et sur le faux. */
export function suiteCalendrier(nom: string, cible: Cible): void {
  describe('suite calendrier commune : ' + nom, () => {
    const avec = async (f: (a: Awaited<ReturnType<Cible>>['appeler']) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };
    const lignes = async (a: Awaited<ReturnType<Cible>>['appeler'], q = PLAGE) => ((await a('GET', CAL + q)).json as { body: Lignes }).body;
    const termes = async (a: Awaited<ReturnType<Cible>>['appeler'], mode: string) => ((await a('GET', '/vocabulaire?mode=' + mode)).json as { body: Termes }).body;

    it('trie par date, les dates inconnues à la fin', () =>
      avec(async (a) => {
        const l = await lignes(a);
        expect(l.at(-1)!.dateLimite).toBeUndefined();
        const dates = l.flatMap((x) => (x.dateLimite === undefined ? [] : [x.dateLimite]));
        expect(dates).toEqual([...dates].sort());
        expect(l.filter((x) => x.dateLimite === undefined).every((x) => x.statut === 'inconnue')).toBe(true);
      }));

    it('plage étroite : seules les échéances de la plage', () =>
      avec(async (a) => {
        const tout = await lignes(a);
        const etroit = await lignes(a, '?du=2026-10-01&au=2026-10-31');
        expect(etroit.length).toBeGreaterThan(0);
        expect(etroit.length).toBeLessThan(tout.length);
        for (const x of etroit.filter((y) => y.dateLimite !== undefined)) expect(x.dateLimite!.startsWith('2026-10')).toBe(true);
      }));

    it('à vérifier : toujours une source', () =>
      avec(async (a) => {
        const verifs = (await lignes(a)).filter((x) => x.aVerifier);
        expect(verifs.length).toBeGreaterThan(0);
        for (const x of verifs) expect(x.sourceUrl).toMatch(/^https:\/\//);
      }));

    it('exercice inconnu : 404 EXERCICE_INCONNU', () =>
      avec(async (a) => {
        const r = await a('GET', '/exercices/EX1999/calendrier' + PLAGE);
        expect(r.status).toBe(404);
        expect((r.json as { code: string }).code).toBe('EXERCICE_INCONNU');
      }));

    it('ordre inversé : 400', () =>
      avec(async (a) => {
        expect((await a('GET', CAL + '?du=2027-12-31&au=2026-01-01')).status).toBe(400);
      }));

    it('query invalide : 400 (date impossible, clé inconnue, clé absente, mode inconnu)', () =>
      avec(async (a) => {
        for (const q of ['?du=2026-02-30&au=2027-12-31', '?du=2026-01-01&au=2026-13-01', PLAGE + '&x=1', '?du=2026-01-01', '']) {
          const r = await a('GET', CAL + q);
          expect(r.status, q).toBe(400);
          expect((r.json as { code: string }).code).toBe('BAD_REQUEST');
        }
        expect((await a('GET', '/vocabulaire?mode=zz')).status).toBe(400);
        expect((await a('GET', '/vocabulaire')).status).toBe(400);
      }));

    it('vocabulaire simple : survol pour les termes validés', () =>
      avec(async (a) => {
        const t = await termes(a, 'simple');
        expect(t.some((x) => x.survol !== undefined)).toBe(true);
        expect(t.some((x) => x.survol === undefined)).toBe(true);
      }));

    it('vocabulaire comptable : mêmes codes, mots différents, jamais de survol', async () => {
      await avec(async (a) => {
        const [s, c] = [await termes(a, 'simple'), await termes(a, 'comptable')];
        expect(c.map((x) => x.code)).toEqual(s.map((x) => x.code));
        expect(c.map((x) => x.mot)).not.toEqual(s.map((x) => x.mot));
        expect(c.every((x) => x.survol === undefined)).toBe(true);
      });
    });
  });
}
