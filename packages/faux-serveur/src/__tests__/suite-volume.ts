import { describe, expect, it } from 'vitest';

export type CibleVolume = (scenario: string | null) => Promise<{ lire: () => Promise<{ status: number; json: unknown }>; fermer: () => Promise<void> }>;
export const SCENARIOS_VOLUME = [null, 'volume=seuil', 'volume=depasse'] as const;

/** Suite commune du volume : jouée sur le vrai serveur et sur le faux. */
export function suiteVolume(nom: string, cible: CibleVolume): void {
  describe('suite volume commune : ' + nom, () => {
    const lire = async (s: string | null) => {
      const c = await cible(s);
      try {
        return await c.lire();
      } finally {
        await c.fermer();
      }
    };

    it('volume-normal-sans-alerte', async () => {
      const r = await lire(null);
      expect(r.status).toBe(200);
      expect(r.json).toMatchObject({ palier: { code: 'compta-1' }, compris: 100, utilise: 20, alertes_bps: [], depasse: false });
    });
    it('volume-seuil-une-alerte', async () => {
      expect((await lire('volume=seuil')).json).toMatchObject({ utilise: 70, alertes_bps: [7000], depasse: false });
    });
    it('volume-depasse-continuer-et-choix', async () => {
      expect((await lire('volume=depasse')).json).toMatchObject({ depasse: true, proposer_choix: true, comportement: 'continuer', palier_superieur: { code: 'compta-2' } });
    });
    it('prevision-entiere-et-superieure-ou-egale-a-utilise', async () => {
      for (const s of SCENARIOS_VOLUME) {
        const v = (await lire(s)).json as { prevision_fin_de_mois: number; utilise: number };
        expect(Number.isSafeInteger(v.prevision_fin_de_mois)).toBe(true);
        expect(v.prevision_fin_de_mois).toBeGreaterThanOrEqual(v.utilise);
      }
    });
    it('aucun-budget-ni-cout-dans-la-reponse', async () => {
      for (const s of SCENARIOS_VOLUME) {
        expect(Object.keys((await lire(s)).json as object).join(' ')).not.toMatch(/cout|budget|jetons|montant|prix/);
      }
    });
  });
}
