import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

const cle = (n: string) => ({ 'idempotency-key': 'cle-fictive-' + n });

/** Suite commune de la demande de palier (vrai serveur et faux). */
export function suitePalier(nom: string, cible: Cible): void {
  describe('suite de la demande de palier commune : ' + nom, () => {
    type A = Awaited<ReturnType<Cible>>['appeler'];
    const avec = (f: (a: A) => Promise<void>) => async () => {
      const x = await cible();
      try {
        await f(x.appeler);
      } finally {
        await x.fermer();
      }
    };
    const poster = (a: A, n: string, corps: object) => a('POST', '/abonnement/demandes-palier', cle(n), corps);

    it('sans-accord-422-aucune-demande', avec(async (a) => {
      const r = await poster(a, '0001', { code_demande: 'compta-2', accord: false });
      expect([r.status, r.json]).toMatchObject([422, { code: 'ACCORD_MANQUANT' }]);
    }));
    it('avec-accord-201-une-demande-un-evenement', avec(async (a) => {
      const r = await poster(a, '0002', { code_demande: 'compta-2', accord: true });
      expect([r.status, r.json]).toMatchObject([201, { demande: { code_actuel: 'compta-1', code_demande: 'compta-2' }, palier_en_vigueur: 'compta-1' }]);
    }));
    it('palier-en-vigueur-inchange', avec(async (a) => {
      await poster(a, '0003', { code_demande: 'compta-3', accord: true });
      const r = await poster(a, '0004', { code_demande: 'compta-2', accord: true });
      expect(r.json).toMatchObject({ palier_en_vigueur: 'compta-1' });
    }));
    it('meme-cle-une-seule-demande', avec(async (a) => {
      const un = await poster(a, '0005', { code_demande: 'compta-2', accord: true });
      const deux = await poster(a, '0005', { code_demande: 'compta-3', accord: true });
      expect([deux.status, deux.json]).toEqual([un.status, un.json]);
    }));
    it('palier-inconnu-404', avec(async (a) => {
      const r = await poster(a, '0006', { code_demande: 'palier-fictif', accord: true });
      expect([r.status, r.json]).toMatchObject([404, { code: 'PALIER_INCONNU' }]);
    }));
    it('palier-inferieur-ou-identique-422', avec(async (a) => {
      const r = await poster(a, '0007', { code_demande: 'compta-1', accord: true });
      expect([r.status, r.json]).toMatchObject([422, { code: 'PALIER_IDENTIQUE' }]);
    }));
    it('accord-chaine-true-refuse-400', avec(async (a) => {
      const r = await poster(a, '0008', { code_demande: 'compta-2', accord: 'true' });
      expect(r.status).toBe(400);
    }));
  });
}
