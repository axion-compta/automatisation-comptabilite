import { describe, expect, it } from 'vitest';
import { ReponseFrais, ReponseFraisDetail } from '../../../contrat/src/domaines/frais.js';
import { creerServiceFrais } from '../../../contrat/src/domaines/frais-service.js';
import { PREFIXE_ROUTES_SOCIETE } from '../../../contrat/src/prefixe-routes.js';
import type { Cible } from './suite-contrat.js';

const PREFIXE = PREFIXE_ROUTES_SOCIETE.replace('{s}', 'soc-lemoine');
type Liste = { body: { id: string; statut: string }[]; decalage: number; total: number; totaux: Record<string, number> };

/** Suite commune « frais en lecture » : jouée sur le vrai serveur et sur le faux. */
export function suiteFrais(nom: string, cible: Cible): void {
  describe('suite frais commune : ' + nom, () => {
    const lire = async (chemin: string) => {
      const c = await cible();
      try {
        return await c.appeler('GET', PREFIXE + chemin);
      } finally {
        await c.fermer();
      }
    };
    const liste = async (q = '') => (await lire('/frais' + q)).json as Liste;

    it('enveloppe-et-totaux', async () => {
      const r = await lire('/frais');
      expect(r.status).toBe(200);
      expect(ReponseFrais.safeParse(r.json).success).toBe(true);
      const l = r.json as Liste;
      expect(l.decalage).toBe(0);
      expect(l.total).toBe(l.body.length);
      expect(Object.keys(l.totaux).sort()).toEqual(['aRembourserCentimes', 'enAttenteCentimes', 'exclusCentimes', 'kmSansMontantDixiemes']);
    });

    it('totaux-sur-la-selection-pas-sur-la-page', async () => {
      const tout = await liste();
      const page = await liste('?limite=1');
      expect(page.body).toHaveLength(1);
      expect(page.total).toBe(tout.total);
      expect(page.totaux).toEqual(tout.totaux);
      expect((await liste('?limite=2&decalage=3')).totaux).toEqual(tout.totaux);
    });

    it('exemple-de-la-demo', async () => {
      const l = await liste('?du=2025-03-12&au=2025-03-12');
      expect(l.total).toBe(12);
      expect(l.totaux).toEqual(creerServiceFrais().lister({ du: '2025-03-12', au: '2025-03-12' }).totaux);
      expect(l.totaux['exclusCentimes']).toBeGreaterThanOrEqual(6400);
    });

    it('filtre-par-statut', async () => {
      const l = await liste('?statut=valide');
      expect(l.total).toBeGreaterThan(0);
      expect(l.body.every((f) => f.statut === 'valide')).toBe(true);
      expect(l.totaux['exclusCentimes']).toBe(0);
    });

    it('periode-inversee-400', async () => {
      const r = await lire('/frais?du=2025-05-01&au=2025-04-01');
      expect(r.status).toBe(400);
      expect(r.json).toMatchObject({ status: 400 });
    });

    it('query-invalide-400', async () => {
      for (const q of ['limite=1.5', 'limite=NaN', 'limite=0', 'limite=101', 'decalage=-1', 'decalage=1.5', 'du=2025-02-30', 'statut=inconnu']) {
        expect([q, (await lire('/frais?' + q)).status]).toEqual([q, 400]);
      }
    });

    it('detail-et-404', async () => {
      const d = await lire('/frais/FRA-012');
      expect(d.status).toBe(200);
      expect(ReponseFraisDetail.safeParse(d.json).success).toBe(true);
      for (const id of ['FRA-999', 'constructor', '__proto__', encodeURIComponent('a/b')]) {
        const r = await lire('/frais/' + id);
        expect([id, r.status]).toEqual([id, 404]);
        expect(r.json).toMatchObject({ code: 'FRAIS_INCONNU', status: 404, defined: true });
      }
    });
  });
}
