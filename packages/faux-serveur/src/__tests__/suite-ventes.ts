import { describe, expect, it } from 'vitest';

export type RetourVentes = { status: number; json: unknown };
/** Une cible de lecture : le serveur en mémoire ou le faux serveur. */
export type CibleVentes = () => Promise<{ lire: (chemin: string) => Promise<RetourVentes>; fermer: () => Promise<void> }>;

type Vente = { id: string; type: string; dateFacture: string; etat: string; client?: { code: string }; avoirsLies: Array<{ id: string }> };
type Liste = { body: Vente[]; decalage: number; total: number };

/** Suite commune des ventes en lecture : écrite une fois, jouée sur le vrai serveur et sur le faux. */
export function suiteVentes(nom: string, cible: CibleVentes): void {
  describe('suite commune des ventes : ' + nom, () => {
    const avec = (f: (lire: (chemin: string) => Promise<RetourVentes>) => Promise<void>) => async () => {
      const c = await cible();
      try {
        await f(c.lire);
      } finally {
        await c.fermer();
      }
    };
    const liste = async (lire: (c: string) => Promise<RetourVentes>, requete = '') => {
      const r = await lire('/ventes' + requete);
      expect(r.status).toBe(200);
      return r.json as Liste;
    };

    it('enveloppe-body-decalage-total', avec(async (lire) => {
      const l = await liste(lire, '?limite=5&decalage=2');
      expect(l.body).toHaveLength(5);
      expect([l.decalage, l.total > 5]).toEqual([2, true]);
    }));
    it('tri-par-date-decroissante', avec(async (lire) => {
      const dates = (await liste(lire)).body.map((v) => v.dateFacture);
      expect(dates.length).toBeGreaterThan(1);
      expect(dates).toEqual([...dates].sort().reverse());
    }));
    it('filtres-etat-client-mois', avec(async (lire) => {
      const tous = (await liste(lire)).body;
      const retard = await liste(lire, '?etat=en_retard');
      expect(retard.body.length).toBeGreaterThan(0);
      expect(retard.body.every((v) => v.etat === 'en_retard')).toBe(true);
      const code = tous.find((v) => v.client)?.client?.code ?? '';
      expect((await liste(lire, '?client=' + code)).body.every((v) => v.client?.code === code)).toBe(true);
      const mois = (tous[0]?.dateFacture ?? '').slice(0, 7);
      const duMois = await liste(lire, '?mois=' + mois);
      expect(duMois.body.length).toBeGreaterThan(0);
      expect(duMois.body.every((v) => v.dateFacture.startsWith(mois))).toBe(true);
    }));
    it('avoir-sous-sa-facture', avec(async (lire) => {
      const l = await liste(lire);
      const avecAvoir = l.body.find((v) => v.avoirsLies.length > 0);
      expect(avecAvoir).toBeDefined();
      const lie = avecAvoir?.avoirsLies[0]?.id ?? '';
      expect(l.body.some((v) => v.id === lie)).toBe(false);
      const detail = await lire('/ventes/' + lie);
      expect((detail.json as { body: Vente }).body.type).toBe('avoir');
    }));
    it('detail-200', avec(async (lire) => {
      const id = (await liste(lire)).body[0]?.id ?? '';
      const r = await lire('/ventes/' + id);
      expect(r.status).toBe(200);
      expect((r.json as { body: Vente }).body.id).toBe(id);
    }));
    it('query-invalide-400', avec(async (lire) => {
      for (const q of ['?mois=2026-13', '?limite=0', '?limite=101', '?decalage=-1']) expect((await lire('/ventes' + q)).status, q).toBe(400);
    }));
    it('vente-inconnue-404', avec(async (lire) => {
      const r = await lire('/ventes/VP-9-999');
      expect([r.status, (r.json as { code: string }).code]).toEqual([404, 'VENTE_INCONNUE']);
    }));
  });
}
