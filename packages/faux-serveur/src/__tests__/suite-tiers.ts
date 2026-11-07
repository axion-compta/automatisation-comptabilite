import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

type Tiers = { code: string; nom: string; type: 'client' | 'fournisseur'; email: string };
type Page = { body: Tiers[]; decalage: number; total: number };

/** Suite commune des tiers : écrite une fois, jouée sur le vrai serveur et sur le faux. */
export function suiteTiers(nom: string, cible: Cible): void {
  describe('suite des tiers commune : ' + nom, () => {
    const avec = async (f: (a: Awaited<ReturnType<Cible>>['appeler']) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };

    it('enveloppe et tri par code', () =>
      avec(async (a) => {
        const r = await a('GET', '/tiers');
        expect(r.status).toBe(200);
        const j = r.json as Page;
        expect(j.decalage).toBe(0);
        expect(j.total).toBeGreaterThan(5);
        expect(j.body).toHaveLength(j.total);
        const codes = j.body.map((t) => t.code);
        expect(codes).toEqual([...codes].sort());
        expect(new Set(codes).size).toBe(codes.length);
        expect(j.body.every((t) => t.email.endsWith('@exemple.fr'))).toBe(true);
      }));

    it('filtre par type', () =>
      avec(async (a) => {
        const tout = (await a('GET', '/tiers')).json as Page;
        for (const type of ['client', 'fournisseur'] as const) {
          const j = (await a('GET', '/tiers?type=' + type)).json as Page;
          expect(j.total).toBeGreaterThan(0);
          expect(j.total).toBeLessThan(tout.total);
          expect(j.body.every((t) => t.type === type)).toBe(true);
          expect(j.total).toBe(tout.body.filter((t) => t.type === type).length);
        }
      }));

    it('recherche sans accent ni casse, par nom ou par code', () =>
      avec(async (a) => {
        const accent = (await a('GET', '/tiers?q=RENOVATION')).json as Page;
        expect(accent.total).toBeGreaterThan(0);
        expect(accent.body.every((t) => t.nom.includes('Rénovation'))).toBe(true);
        const code = (await a('GET', '/tiers?q=cli001')).json as Page;
        expect(code).toMatchObject({ total: 1 });
        expect(code.body[0]).toMatchObject({ code: 'CLI001', type: 'client' });
        const croise = (await a('GET', '/tiers?type=fournisseur&q=cli001')).json as Page;
        expect(croise).toEqual({ body: [], decalage: 0, total: 0 });
        expect((await a('GET', '/tiers?q=zzzinconnu')).json).toEqual({ body: [], decalage: 0, total: 0 });
      }));

    it('pagination : limite et décalage, total inchangé', () =>
      avec(async (a) => {
        const tout = (await a('GET', '/tiers')).json as Page;
        const p = (await a('GET', '/tiers?limite=2&decalage=1')).json as Page;
        expect(p.body.map((t) => t.code)).toEqual(tout.body.slice(1, 3).map((t) => t.code));
        expect(p).toMatchObject({ decalage: 1, total: tout.total });
        expect((await a('GET', '/tiers?decalage=999')).json).toMatchObject({ body: [], decalage: 999, total: tout.total });
      }));

    it('400 : type inconnu ou vide, limite et décalage invalides (NaN, Infinity, non entier, vide), q trop long, paramètre répété', () =>
      avec(async (a) => {
        const mauvaises = [
          'type=autre', 'type=', 'limite=0', 'limite=101', 'limite=1.5', 'limite=NaN', 'limite=Infinity', 'limite=abc', 'limite=',
          'decalage=-1', 'decalage=0.5', 'decalage=NaN', 'decalage=Infinity',
          'q=' + 'x'.repeat(51), 'type[]=client', 'type[]=autre', 'q[]=a', 'type=client&type=fournisseur', 'q=a&q=b', 'limite=1&limite=1', 'decalage=0&decalage=1',
        ];
        for (const q of mauvaises) {
          const r = await a('GET', '/tiers?' + q);
          expect([q, r.status]).toEqual([q, 400]);
          expect(r.json).toMatchObject({ defined: false, code: 'BAD_REQUEST', status: 400 });
        }
        // Écart de coercition connu, identique des deux côtés : decalage vide vaut 0.
        expect((await a('GET', '/tiers?decalage=')).json).toMatchObject({ decalage: 0 });
        expect((await a('GET', '/tiers?limite=100&q=' + 'x'.repeat(50))).status).toBe(200);
      }));

    it('limite à 1 et ordre inversé des paramètres : même réponse', () =>
      avec(async (a) => {
        const un = (await a('GET', '/tiers?limite=1')).json as Page;
        expect(un.body).toHaveLength(1);
        const x = (await a('GET', '/tiers?type=client&limite=2&decalage=1')).json;
        const y = (await a('GET', '/tiers?decalage=1&limite=2&type=client')).json;
        expect(x).toEqual(y);
      }));

    it('clé inconnue : ignorée, 200', () =>
      avec(async (a) => {
        for (const q of ['foo=1', 'typex=1', 'foo[x]=1']) {
          const r = await a('GET', '/tiers?' + q);
          expect([q, r.status]).toEqual([q, 200]);
        }
      }));
  });
}
