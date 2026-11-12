import { describe, expect, it } from 'vitest';
import { CODES_SANTE, ReponseSante } from '../../../contrat/src/domaines/sante.js';
import { creerServiceSante } from '../../../contrat/src/domaines/sante-service.js';
import { SanteExploitation } from '../../../contrat/src/domaines/sante-exploitation.js';
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

export type CibleSanteExploitation = (panne: string | null) => Promise<{ lire: () => Promise<{ status: number; json: unknown }>; fermer: () => Promise<void> }>;

/** Suite commune « santé d'exploitation » : jouée sur le serveur en mémoire et sur le faux serveur. */
export function suiteSanteExploitation(nom: string, cible: CibleSanteExploitation): void {
  const lire = async (panne: string | null) => {
    const c = await cible(panne);
    try {
      return await c.lire();
    } finally {
      await c.fermer();
    }
  };
  describe('suite santé d’exploitation : ' + nom, () => {
    it('sante-ok-par-defaut', async () => {
      const r = await lire(null);
      expect(r.status).toBe(200);
      expect(r.json).toMatchObject({ body: { etat: 'ok', migration: 0 } });
    });

    it('trois-champs-seulement', async () => {
      const { body } = (await lire(null)).json as { body: object };
      expect(Object.keys(body).sort()).toEqual(['etat', 'migration', 'version']);
      expect(SanteExploitation.safeParse(body).success).toBe(true);
    });
  });
}
