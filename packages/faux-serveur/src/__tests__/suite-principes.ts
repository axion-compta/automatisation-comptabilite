import { describe, expect, it } from 'vitest';
import { ReponseGestesHumains } from '../../../contrat/src/domaines/principes.js';
import { CATALOGUE_GESTES } from '../../../noyau/src/principes/gestes.js';
import type { Cible } from './suite-contrat.js';

/** Suite commune des principes : écrite une fois, jouée sur le vrai serveur et sur le faux. */
export function suitePrincipes(nom: string, cible: Cible): void {
  describe('suite des principes commune : ' + nom, () => {
    const lire = async () => {
      const c = await cible();
      try {
        return await c.appeler('GET', '/gestes-humains');
      } finally {
        await c.fermer();
      }
    };

    it('douze-gestes : G01 à G12, identiques au catalogue du noyau', async () => {
      const r = await lire();
      expect(r.status).toBe(200);
      const j = r.json as { body: Array<{ code: string }> };
      expect(j.body).toHaveLength(12);
      expect(j.body.map((g) => g.code)).toEqual(CATALOGUE_GESTES.map((g) => g.code));
      expect(j.body).toEqual(CATALOGUE_GESTES.map((g) => ({ ...g })));
    });

    it('forme-enveloppe : body, decalage 0, total 12', async () => {
      const j = (await lire()).json as Record<string, unknown>;
      expect(Object.keys(j).sort()).toEqual(['body', 'decalage', 'total']);
      expect(j['decalage']).toBe(0);
      expect(j['total']).toBe(12);
    });

    it('reponse-valide-par-le-schema', async () => {
      expect(ReponseGestesHumains.safeParse((await lire()).json).success).toBe(true);
    });
  });
}
