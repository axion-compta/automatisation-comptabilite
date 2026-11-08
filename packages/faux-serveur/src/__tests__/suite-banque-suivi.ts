import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

type Liste<T> = { body: T[]; decalage: number; total: number };
type Mois = { mois: string; etat: string };

/** Suite commune du suivi bancaire (couverture, trous, demandes, doublons) : jouée sur le vrai serveur et sur le faux. */
export function suiteBanqueSuivi(nom: string, cible: Cible): void {
  describe('suite banque suivi commune : ' + nom, () => {
    const avec = async (f: (a: Awaited<ReturnType<Cible>>['appeler']) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };

    it('couverture-septembre-manquant', () =>
      avec(async (a) => {
        const r = await a('GET', '/banque/comptes/BQ1/couverture');
        const mois = (r.json as { body: { compteId: string; mois: Mois[] } }).body.mois;
        expect([r.status, (r.json as { body: { compteId: string } }).body.compteId]).toEqual([200, 'BQ1']);
        expect(mois.find((m) => m.mois === '2026-09')?.etat).toBe('manquant');
        expect(mois.filter((m) => m.etat === 'manquant')).toHaveLength(1);
        const vide = (await a('GET', '/banque/comptes/BQ2/couverture')).json as { body: { mois: Mois[] } };
        expect(vide.body.mois.length).toBe(mois.length);
        expect(vide.body.mois.every((m) => m.etat === 'manquant')).toBe(true);
        expect((await a('GET', '/banque/comptes/BQ1/couverture?exercice_id=EX1')).status).toBe(200);
        expect((await a('GET', '/banque/comptes/BQ1/couverture?exercice_id=')).status).toBe(400);
      }));

    it('trous-ouverts', () =>
      avec(async (a) => {
        const tout = (await a('GET', '/banque/trous')).json as Liste<{ compteId: string; etat: string; debut: string; fin: string }>;
        const ouverts = (await a('GET', '/banque/trous?etat=ouvert')).json as typeof tout;
        expect(tout.total).toBe(tout.body.length);
        expect(ouverts.body.length).toBeGreaterThan(0);
        expect(ouverts.body).toEqual(tout.body.filter((t) => t.etat === 'ouvert'));
        expect(ouverts.body[0]).toMatchObject({ compteId: 'BQ1', debut: '2026-09-01', fin: '2026-09-30' });
        expect((await a('GET', '/banque/trous?etat=comble')).json).toEqual({ body: [], decalage: 0, total: 0 });
      }));

    it('demandes-triees-par-impact', () =>
      avec(async (a) => {
        const d = (await a('GET', '/banque/demandes')).json as Liste<{ id: string; impactCentimes: number; etat: string }>;
        const impacts = d.body.map((x) => x.impactCentimes);
        expect(d.body.length).toBeGreaterThan(1);
        expect(impacts).toEqual([...impacts].sort((x, y) => y - x));
        expect(d.total).toBe(d.body.length);
        expect((await a('GET', '/banque/demandes?etat=ouverte')).json).toEqual(d);
        expect((await a('GET', '/banque/demandes?etat=repondue')).json).toEqual({ body: [], decalage: 0, total: 0 });
      }));

    it('doublons-proposes', () =>
      avec(async (a) => {
        const d = (await a('GET', '/banque/doublons?etat=propose')).json as Liste<{ ligneA: string; ligneB: string; etat: string }>;
        expect(d.body.length).toBeGreaterThan(0);
        expect(d.body.every((x) => x.etat === 'propose' && x.ligneA !== x.ligneB)).toBe(true);
        expect((await a('GET', '/banque/doublons')).json).toEqual(d);
        expect((await a('GET', '/banque/doublons?etat=rejete')).json).toMatchObject({ body: [], total: 0 });
      }));

    it('compte-inconnu-404', () =>
      avec(async (a) => {
        const r = await a('GET', '/banque/comptes/inconnu/couverture');
        expect([r.status, r.json]).toMatchObject([404, { code: 'COMPTE_INCONNU', status: 404 }]);
        for (const q of ['/banque/trous?etat=AUTRE', '/banque/trous?etat=', '/banque/demandes?etat=ouvert', '/banque/demandes?etat=propose', '/banque/doublons?etat=ouvert', '/banque/doublons?etat=propose&etat=rejete']) {
          expect([q, (await a('GET', q)).status]).toEqual([q, 400]);
        }
      }));
  });
}
