import { describe, expect, it } from 'vitest';
import { CODES_SANTE, ReponseSante } from '../../../contrat/src/domaines/sante.js';
import { creerServiceSante } from '../../../contrat/src/domaines/sante-service.js';
import type { Cible } from './suite-contrat.js';

const GRAVITE = { vert: 0, orange: 1, rouge: 2 } as const;

/** Suite commune « santé des contrôles » : jouée sur le vrai serveur et sur le faux. */
export function suiteSante(nom: string, cible: Cible): void {
  describe('suite santé commune : ' + nom, () => {
    const lire = async () => {
      const c = await cible();
      try {
        return await c.appeler('GET', '/controles/sante');
      } finally {
        await c.fermer();
      }
    };
    const corps = async () => (await lire()).json as { body: ReponseSante };

    it('cinq-sous-indicateurs', async () => {
      const r = await lire();
      expect(r.status).toBe(200);
      const { body } = r.json as { body: ReponseSante };
      expect(body.sousIndicateurs.map((x) => x.code)).toEqual([...CODES_SANTE]);
      expect(body).toEqual(creerServiceSante().lire());
    });

    it('globale-coherente', async () => {
      const { body } = await corps();
      expect(GRAVITE[body.globale]).toBe(Math.max(...body.sousIndicateurs.map((x) => GRAVITE[x.couleur])));
    });

    it('reponse-valide-au-schema', async () => {
      const { body } = await corps();
      expect(ReponseSante.safeParse(body).success).toBe(true);
      expect(ReponseSante.safeParse({ ...body, sousIndicateurs: body.sousIndicateurs.slice(1) }).success).toBe(false);
      expect(JSON.stringify(await corps())).toBe(JSON.stringify({ body }));
    });
  });
}
