import { describe, expect, it } from 'vitest';
import { ReponseExplicationEcart } from '../../../contrat/src/domaines/change.js';
import type { Cible } from './suite-contrat.js';

const NBSP = '\u00a0';
const PHRASE = `Perte de change de 18,00${NBSP}€ : la facture a été enregistrée au taux de 0,92000000 (taux de test, source fictive, 07/10/2026) et payée à 0,95000000 (taux de test, source fictive, 20/11/2026).`;

/** Suite commune « explication d'un écart de change » : jouée sur le vrai serveur et sur le faux. */
export function suiteChange(nom: string, cible: Cible): void {
  describe('suite change commune : ' + nom, () => {
    const lire = async (id: string) => {
      const c = await cible();
      try {
        return await c.appeler('GET', '/ecarts-change/' + id + '/explication');
      } finally {
        await c.fermer();
      }
    };

    it('explication-connue', async () => {
      const r = await lire('ECART-001');
      expect(r.status).toBe(200);
      expect((r.json as { body: { sens: string; phrase: string } }).body).toMatchObject({ sens: 'perte', phrase: PHRASE });
    });

    it('inconnu-404', async () => {
      const ids = ['ECART-000', 'constructor', '__proto__', encodeURIComponent('a/b'), encodeURIComponent('é %'), ''];
      for (const id of ids) {
        const r = await lire(id);
        if (id === '') {
          expect([400, 404]).toContain(r.status);
          continue;
        }
        expect([id, r.status]).toEqual([id, 404]);
        expect(r.json).toMatchObject({ code: 'ECART_INCONNU', status: 404, defined: true });
      }
    });

    it('reponse-valide-par-le-schema', async () => {
      for (const id of ['ECART-001', 'ECART-002']) {
        expect(ReponseExplicationEcart.safeParse((await lire(id)).json).success).toBe(true);
      }
    });
  });
}
