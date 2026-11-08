import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

type Appel = Awaited<ReturnType<Cible>>['appeler'];
type Periode = { id: string; debut: string; exerciceId: string };
type Declaration = { mention: string; cases: Array<{ sources: unknown[] }>; controles: unknown[] };

/** Suite commune « TVA en lecture » : jouée sur le vrai serveur et sur le faux. */
export function suiteTva(nom: string, cible: Cible): void {
  describe('suite TVA commune : ' + nom, () => {
    const avec = async (f: (a: Appel) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };
    const code = (r: { json: unknown }) => (r.json as { code: string }).code;

    it('périodes : enveloppe, tri et pagination', () =>
      avec(async (a) => {
        const r = await a('GET', '/exercices/EX2026/tva/periodes');
        const j = r.json as { body: Periode[]; decalage: number; total: number };
        expect(r.status).toBe(200);
        expect(j.body.map((p) => p.id)).toEqual(['PER2026T1', 'PER2026T2']);
        expect(j.body.map((p) => p.debut)).toEqual([...j.body.map((p) => p.debut)].sort());
        expect(j).toMatchObject({ decalage: 0, total: 2 });
        const page = (await a('GET', '/exercices/EX2026/tva/periodes?limite=1&decalage=1')).json as typeof j;
        expect(page.body.map((p) => p.id)).toEqual(['PER2026T2']);
        expect(page).toMatchObject({ decalage: 1, total: 2 });
        expect((await a('GET', '/exercices/EX2026/tva/periodes?decalage=50')).json).toEqual({ body: [], decalage: 50, total: 2 });
      }));

    it('périodes : exercice inconnu 404, query invalide 400', () =>
      avec(async (a) => {
        const inconnu = await a('GET', '/exercices/EX0000/tva/periodes');
        expect([inconnu.status, code(inconnu)]).toEqual([404, 'EXERCICE_INCONNU']);
        for (const q of ['?limite=0', '?limite=101', '?limite=1.5', '?limite=NaN', '?limite=Infinity', '?decalage=-1', '?limite=abc']) {
          const r = await a('GET', '/exercices/EX2026/tva/periodes' + q);
          expect([q, r.status]).toEqual([q, 400]);
          expect(code(r)).toBe('BAD_REQUEST');
        }
      }));

    it('estimation non calculée : aucun montant', () =>
      avec(async (a) => {
        const r = await a('GET', '/exercices/EX2026/tva/estimation');
        const e = (r.json as { body: Record<string, unknown> }).body;
        expect(r.status).toBe(200);
        expect(e).toMatchObject({ etat: 'non_calculee', motif: 'tva_en_doute' });
        expect(Object.keys(e).filter((k) => /centimes|montant/i.test(k))).toEqual([]);
      }));

    it('estimation calculée : montants entiers', () =>
      avec(async (a) => {
        const e = ((await a('GET', '/exercices/EX2025/tva/estimation')).json as { body: Record<string, unknown> }).body;
        expect(e['etat']).toBe('calculee');
        expect(Number.isInteger(e['collecteeCentimes'])).toBe(true);
        expect(Number.isInteger(e['deductibleCentimes'])).toBe(true);
      }));

    it('estimation : exercice inconnu 404', () =>
      avec(async (a) => {
        const r = await a('GET', '/exercices/EX0000/tva/estimation');
        expect([r.status, code(r)]).toEqual([404, 'EXERCICE_INCONNU']);
      }));

    it('déclaration : sources, contrôles et mention', () =>
      avec(async (a) => {
        const r = await a('GET', '/tva/declarations/DEC2025T4');
        const d = (r.json as { body: Declaration }).body;
        expect(r.status).toBe(200);
        expect(d.mention).toBe('prepare_par_ia');
        expect(d.cases.length).toBeGreaterThan(0);
        expect(d.cases.every((c) => c.sources.length > 0)).toBe(true);
        expect(d.controles.length).toBeGreaterThan(0);
      }));

    it('déclaration inconnue : 404, y compris identifiant encodé', () =>
      avec(async (a) => {
        for (const id of ['DEC0000', encodeURIComponent('a/b?c#d'), encodeURIComponent('é %')]) {
          const r = await a('GET', '/tva/declarations/' + id);
          expect([id, r.status]).toEqual([id, 404]);
          expect(code(r)).toBe('DECLARATION_INCONNUE');
        }
      }));

    it('identifiant vide : refusé (400 ou 404, jamais 200)', () =>
      avec(async (a) => {
        for (const chemin of ['/tva/declarations/', '/exercices//tva/estimation', '/exercices//tva/periodes']) {
          const r = await a('GET', chemin);
          expect([chemin, [400, 404].includes(r.status)]).toEqual([chemin, true]);
        }
      }));

    it('exercice avec caractères spéciaux encodés : 404', () =>
      avec(async (a) => {
        const r = await a('GET', '/exercices/' + encodeURIComponent('EX 2026/é') + '/tva/estimation');
        expect(r.status).toBe(404);
      }));
  });
}
