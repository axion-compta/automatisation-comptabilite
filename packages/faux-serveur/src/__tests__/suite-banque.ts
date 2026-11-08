import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

type Page = { body: Array<{ id: string; compteId: string; date: string; etat: string }>; decalage: number; total: number };

/** Suite commune de la banque : jouée sur le vrai serveur et sur le faux. `panneSimulee` : seul le faux serveur lit l'en-tête x-panne. */
export function suiteBanque(nom: string, cible: Cible, panneSimulee: boolean): void {
  describe('suite banque commune : ' + nom, () => {
    const avec = async (f: (a: Awaited<ReturnType<Cible>>['appeler']) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };

    it('comptes-trois', () =>
      avec(async (a) => {
        const r = await a('GET', '/banque/comptes');
        const j = r.json as { body: Array<{ id: string; ibanMasque: string }>; decalage: number; total: number };
        expect(r.status).toBe(200);
        expect([j.body.length, j.total, j.decalage]).toEqual([3, 3, 0]);
        expect(new Set(j.body.map((c) => c.id)).size).toBe(3);
        expect(j.body.every((c) => c.ibanMasque.includes('*'))).toBe(true);
      }));

    it('lignes-filtre-etat', () =>
      avec(async (a) => {
        const tout = (await a('GET', '/banque/lignes')).json as Page;
        const etat = tout.body[0]?.etat ?? '';
        const f = (await a('GET', '/banque/lignes?etat=' + etat)).json as Page;
        expect(f.total).toBe(tout.body.filter((l) => l.etat === etat).length);
        expect(f.body.every((l) => l.etat === etat)).toBe(true);
        const compte = tout.body[0]?.compteId ?? '';
        const c = (await a('GET', '/banque/lignes?compte=' + compte)).json as Page;
        expect(c.body.every((l) => l.compteId === compte)).toBe(true);
        const inverse = (await a('GET', '/banque/lignes?du=2999-01-01&au=1970-01-01')).json;
        expect(inverse).toEqual({ body: [], decalage: 0, total: 0 });
        const x = (await a('GET', `/banque/lignes?etat=${etat}&compte=${compte}`)).json;
        expect((await a('GET', `/banque/lignes?compte=${compte}&etat=${etat}`)).json).toEqual(x);
        const inconnu = await a('GET', '/banque/lignes?compte=inconnu');
        expect([inconnu.status, inconnu.json]).toMatchObject([404, { code: 'COMPTE_INCONNU' }]);
        expect((await a('GET', '/banque/lignes?etat=AUTRE')).status).toBe(400);
        expect((await a('GET', '/banque/lignes?compte=')).status).toBe(400);
      }));

    it('lignes-pagination-limite-cent', () =>
      avec(async (a) => {
        const tout = (await a('GET', '/banque/lignes')).json as Page;
        const p = (await a('GET', '/banque/lignes?limite=2&decalage=1')).json as Page;
        expect(p.body.map((l) => l.id)).toEqual(tout.body.slice(1, 3).map((l) => l.id));
        expect(p).toMatchObject({ decalage: 1, total: tout.total });
        expect((await a('GET', '/banque/lignes?limite=100')).status).toBe(200);
        expect((await a('GET', '/banque/lignes?decalage=999999')).json).toMatchObject({ body: [], total: tout.total });
        for (const q of ['limite=101', 'limite=0', 'limite=1.5', 'limite=NaN', 'limite=Infinity', 'decalage=-1', 'decalage=0.5', 'decalage=NaN']) {
          expect([q, (await a('GET', '/banque/lignes?' + q)).status]).toEqual([q, 400]);
        }
      }));

    it('explication-ligne-connue', () =>
      avec(async (a) => {
        const id = ((await a('GET', '/banque/lignes?limite=1')).json as Page).body[0]?.id ?? '';
        const r = await a('GET', `/banque/lignes/${id}/explication`);
        expect(r.status).toBe(200);
        expect((r.json as { body: { codeMot: string; facteurs: unknown[] } }).body.codeMot).toEqual(expect.any(String));
        expect(Array.isArray((r.json as { body: { facteurs: unknown[] } }).body.facteurs)).toBe(true);
      }));

    it('ligne-inconnue-404', () =>
      avec(async (a) => {
        const r = await a('GET', '/banque/lignes/inconnue/explication');
        expect([r.status, r.json]).toMatchObject([404, { code: 'LIGNE_INCONNUE', status: 404 }]);
        expect((await a('GET', '/banque/lignes/%20/explication')).status).toBe(404);
      }));

    it('panne-403-simulee', () =>
      avec(async (a) => {
        for (const chemin of ['/banque/comptes', '/banque/lignes', '/banque/lignes/x/explication']) {
          const r = await a('GET', chemin, { 'x-panne': '403' });
          if (panneSimulee) expect([chemin, r.status, r.json]).toMatchObject([chemin, 403, { code: 'FORBIDDEN', status: 403 }]);
          else expect([chemin, r.status === 403]).toEqual([chemin, false]);
        }
        if (panneSimulee) {
          expect((await a('GET', '/banque/comptes', { 'x-panne': '423' })).status).toBe(423);
          expect((await a('GET', '/banque/comptes', { 'x-panne': '409' })).status).toBe(409);
          expect((await a('GET', '/banque/comptes', { 'x-panne': '500' })).status).toBe(200);
        }
      }));
  });
}
