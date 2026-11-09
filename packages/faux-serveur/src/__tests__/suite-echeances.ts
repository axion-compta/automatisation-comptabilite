import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

type Appel = Awaited<ReturnType<Cible>>['appeler'];
type Ech = { code: string; dateLimite: string; statut: string; dateAVerifier: boolean; niveau: string };
type Liste = { body: Ech[]; total: number };

/** Suite commune « échéances » : jouée sur le vrai serveur et sur le faux. */
export function suiteEcheances(nom: string, cible: Cible): void {
  describe('suite échéances commune : ' + nom, () => {
    const avec = async (f: (a: Appel) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };
    const lister = async (a: Appel, du: string, au: string) => {
      const r = await a('GET', `/echeances?du=${du}&au=${au}`);
      return { status: r.status, json: r.json as Liste };
    };

    it('intervalle large : tri par date, forme complète', () =>
      avec(async (a) => {
        const r = await lister(a, '2000-01-01', '2999-12-31');
        expect(r.status).toBe(200);
        expect(r.json.total).toBe(r.json.body.length);
        expect(r.json.body.map((e) => e.code)).toEqual(['ECH_A', 'ECH_B']);
        const dates = r.json.body.map((e) => e.dateLimite);
        expect(dates).toEqual([...dates].sort());
        expect(r.json.body[0]).toEqual({ code: 'ECH_A', dateLimite: dates[0], statut: 'en_retard', dateAVerifier: true, niveau: 'rappel_seul' });
        expect(r.json.body[1]).toMatchObject({ statut: 'a_venir', niveau: 'alerte' });
      }));

    it('bornes incluses, du = au, intervalle vide', () =>
      avec(async (a) => {
        const [x, y] = (await lister(a, '2000-01-01', '2999-12-31')).json.body.map((e) => e.dateLimite) as [string, string];
        expect((await lister(a, x, y)).json.total).toBe(2);
        expect((await lister(a, x, x)).json.body.map((e) => e.code)).toEqual(['ECH_A']);
        expect((await lister(a, y, y)).json.body.map((e) => e.code)).toEqual(['ECH_B']);
        const veille = new Date(Date.parse(x) - 86_400_000).toISOString().slice(0, 10);
        expect((await lister(a, '2000-01-01', veille)).json).toEqual({ body: [], total: 0 });
        expect((await lister(a, '2000-01-01', '2000-01-01')).json).toEqual({ body: [], total: 0 });
      }));

    it('au avant du : 400', () =>
      avec(async (a) => {
        for (const [du, au] of [['2026-12-31', '2026-01-01'], ['2026-01-02', '2026-01-01']] as const) {
          const r = await a('GET', `/echeances?du=${du}&au=${au}`);
          expect([r.status, (r.json as { code: string }).code]).toEqual([400, 'BAD_REQUEST']);
        }
      }));

    it('date mal formée, absente ou champ en trop : 400', () =>
      avec(async (a) => {
        const requetes = ['?du=2026-02-30&au=2026-03-01', '?du=2026-01-01&au=2026-13-01', '?du=2026-1-1&au=2026-03-01', '?du=&au=2026-03-01', '?du=demain&au=2026-03-01', '?du=2026-01-01', '?au=2026-03-01', '', '?du=2026-01-01&au=2026-03-01&x=1'];
        for (const q of requetes) {
          const r = await a('GET', '/echeances' + q);
          expect([q, r.status]).toEqual([q, 400]);
        }
        expect((await lister(a, '2024-02-29', '2024-02-29')).status).toBe(200);
      }));
  });
}
