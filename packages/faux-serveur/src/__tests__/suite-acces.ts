import { describe, expect, it } from 'vitest';

export type CibleAcces = (scenario: string | null) => Promise<{ lire: () => Promise<{ status: number; json: unknown }>; fermer: () => Promise<void> }>;
export const SCENARIOS_ACCES = [null, 'acces=essai', 'acces=delai_de_grace;reprise=oui', 'acces=lecture_seule;reprise=oui', 'acces=suspendu', 'acces=resilie'] as const;
const horsMontant = (j: unknown): boolean => !/montant|prix|€/i.test(JSON.stringify(j));

/** Suite commune de l'accès : jouée sur le vrai serveur et sur le faux. */
export function suiteAcces(nom: string, cible: CibleAcces): void {
  describe('suite accès commune : ' + nom, () => {
    const lire = async (s: string | null) => {
      const c = await cible(s);
      try {
        return await c.lire();
      } finally {
        await c.fermer();
      }
    };

    it('actif-par-defaut-sans-banniere', async () => {
      const r = await lire(null);
      expect(r).toEqual({ status: 200, json: { etat: 'ACTIF', banniere: null, reprise: null } });
    });

    it('bannière sans montant, lien contacter_axion, état attendu', async () => {
      const r = await lire('acces=suspendu');
      expect(r.status).toBe(200);
      expect(r.json).toMatchObject({ etat: 'SUSPENDU', banniere: { lien: 'contacter_axion' }, reprise: null });
      expect(horsMontant(r.json)).toBe(true);
    });

    it('reprise : 20 pièces en essai, null en lecture seule', async () => {
      expect(((await lire('acces=essai;reprise=oui')).json as { reprise: unknown }).reprise).toEqual({ pieces_traitees: 20 });
      expect(((await lire('acces=lecture_seule;reprise=oui')).json as { reprise: unknown }).reprise).toBeNull();
    });

    it('scénario invalide : accès actif', async () => {
      expect((await lire('acces=inconnu')).json).toEqual({ etat: 'ACTIF', banniere: null, reprise: null });
    });
  });
}
