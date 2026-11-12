import { describe, expect, it } from 'vitest';

export type RetourClients = { status: number; json: unknown };
/** Une cible de lecture : le serveur en mémoire ou le faux serveur. */
export type CibleClients = () => Promise<{ lire: (chemin: string) => Promise<RetourClients>; fermer: () => Promise<void> }>;

type Fiche = { code: string; nom: string; soldeCentimes: number; facturesOuvertes: Array<{ resteDuCentimes: number }>; delaiMoyenJours: number | null };

/** Suite commune de la fiche client : écrite une fois, jouée sur le vrai serveur et sur le faux. */
export function suiteClients(nom: string, cible: CibleClients): void {
  describe('suite commune de la fiche client : ' + nom, () => {
    const avec = (f: (lire: (chemin: string) => Promise<RetourClients>) => Promise<void>) => async () => {
      const c = await cible();
      try {
        await f(c.lire);
      } finally {
        await c.fermer();
      }
    };
    const fiches = async (lire: (c: string) => Promise<RetourClients>) => {
      const ventes = (await lire('/ventes?limite=100')).json as { body: Array<{ client?: { code: string } }> };
      const codes = [...new Set(ventes.body.map((v) => v.client?.code ?? '').filter(Boolean))];
      expect(codes.length).toBeGreaterThan(0);
      const retours = await Promise.all(codes.map((c) => lire('/clients/' + c)));
      retours.forEach((r) => expect(r.status).toBe(200));
      return retours.map((r) => (r.json as { body: Fiche }).body);
    };

    it('fiche-et-solde', avec(async (lire) => {
      for (const f of await fiches(lire)) {
        expect(f.nom.length).toBeGreaterThan(0);
        expect(f.soldeCentimes).toBe(f.facturesOuvertes.reduce((s, x) => s + x.resteDuCentimes, 0));
      }
    }));
    it('factures-ouvertes-seulement', avec(async (lire) => {
      const toutes = (await fiches(lire)).flatMap((f) => f.facturesOuvertes);
      expect(toutes.length).toBeGreaterThan(0);
      expect(toutes.every((x) => x.resteDuCentimes > 0)).toBe(true);
    }));
    it('delai-moyen-entier-ou-null', avec(async (lire) => {
      const delais = (await fiches(lire)).map((f) => f.delaiMoyenJours);
      expect(delais.some((d) => d !== null)).toBe(true);
      expect(delais.every((d) => d === null || (Number.isInteger(d) && d >= 0))).toBe(true);
    }));
    it('client-inconnu-404', avec(async (lire) => {
      const r = await lire('/clients/CLI-INCONNU');
      expect([r.status, (r.json as { code: string }).code]).toEqual([404, 'CLIENT_INCONNU']);
    }));
  });
}
