import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

type Page = { body: Array<{ numero: string; libelle: string; classe: number; soldeCentimes: number }>; decalage: number; total: number };

/** Suite commune du plan : écrite une fois, jouée sur le vrai serveur et sur le faux. */
export function suitePlan(nom: string, cible: Cible): void {
  describe('suite du plan commune : ' + nom, () => {
    const avec = async (f: (a: Awaited<ReturnType<Cible>>['appeler']) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };

    it('exercices : enveloppe, du plus récent au plus ancien', () =>
      avec(async (a) => {
        const r = await a('GET', '/exercices');
        expect(r.status).toBe(200);
        const j = r.json as { body: Array<{ id: string }>; decalage: number; total: number };
        expect(j.body.map((e) => e.id)).toEqual(['EX2026', 'EX2025']);
        expect(j).toMatchObject({ decalage: 0, total: 2 });
      }));

    it('plan : enveloppe, soldes entiers, tri par numéro', () =>
      avec(async (a) => {
        const r = await a('GET', '/exercices/EX2026/plan');
        expect(r.status).toBe(200);
        const j = r.json as Page;
        expect(j.decalage).toBe(0);
        expect(j.total).toBeGreaterThan(5);
        expect(j.body).toHaveLength(j.total);
        const numeros = j.body.map((c) => c.numero);
        expect(numeros).toEqual([...numeros].sort());
        expect(j.body.every((c) => Number.isInteger(c.soldeCentimes))).toBe(true);
      }));

    it('filtres : classe, recherche sans accent ni casse, combinés', () =>
      avec(async (a) => {
        const tout = (await a('GET', '/exercices/EX2026/plan')).json as Page;
        const c5 = (await a('GET', '/exercices/EX2026/plan?classe=5')).json as Page;
        expect(c5.total).toBeGreaterThan(0);
        expect(c5.total).toBeLessThan(tout.total);
        expect(c5.body.every((c) => c.classe === 5)).toBe(true);
        const banque = (await a('GET', '/exercices/EX2026/plan?classe=5&q=BANQUE')).json as Page;
        expect(banque).toMatchObject({ total: 1 });
        expect(banque.body[0]).toMatchObject({ numero: '512000', libelle: 'Banque' });
        const rien = (await a('GET', '/exercices/EX2026/plan?q=zzzinconnu')).json as Page;
        expect(rien).toEqual({ body: [], decalage: 0, total: 0 });
      }));

    it('pagination : limite et décalage, total inchangé', () =>
      avec(async (a) => {
        const tout = (await a('GET', '/exercices/EX2026/plan')).json as Page;
        const p = (await a('GET', '/exercices/EX2026/plan?limite=2&decalage=1')).json as Page;
        expect(p.body.map((c) => c.numero)).toEqual(tout.body.slice(1, 3).map((c) => c.numero));
        expect(p).toMatchObject({ decalage: 1, total: tout.total });
        expect((await a('GET', '/exercices/EX2026/plan?decalage=999')).json).toMatchObject({ body: [], decalage: 999, total: tout.total });
      }));

    it('404 EXERCICE_INCONNU pour un exercice absent', () =>
      avec(async (a) => {
        const r = await a('GET', '/exercices/EX1999/plan');
        expect(r.status).toBe(404);
        expect(r.json).toMatchObject({ code: 'EXERCICE_INCONNU', status: 404 });
      }));

    it('400 : classe hors bornes, limite hors bornes, décalage négatif, q trop long', () =>
      avec(async (a) => {
        for (const q of ['classe=0', 'classe=8', 'classe=1.5', 'limite=0', 'limite=101', 'decalage=-1', 'q=' + 'x'.repeat(51)]) {
          const r = await a('GET', '/exercices/EX2026/plan?' + q);
          expect([q, r.status]).toEqual([q, 400]);
          expect(r.json).toMatchObject({ code: 'BAD_REQUEST', status: 400 });
        }
        expect((await a('GET', '/exercices/EX2026/plan?classe=7&limite=100&q=' + 'x'.repeat(50))).status).toBe(200);
      }));
  });
}
