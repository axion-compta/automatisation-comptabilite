import { describe, expect, it } from 'vitest';
import type { CibleVentes, RetourVentes } from './suite-ventes.js';

type Ind = { montantCentimes: number; pieces: string[] };
type Corps = { chiffreAffaires: Ind; aEncaisser: Ind; enRetard: Ind & { clients: number }; tvaCollectee: Ind | { nonCalculee: string }; tvaEnAttente: Ind; provisoire: boolean };
type Serie = { serie: string; trous: number[]; doublons: unknown[] };

/** Suite commune des indicateurs et des suites de numéros : jouée sur le vrai serveur et sur le faux. */
export function suiteVentesIndicateurs(nom: string, cible: CibleVentes): void {
  describe('suite commune des indicateurs de ventes : ' + nom, () => {
    const avec = (f: (lire: (chemin: string) => Promise<RetourVentes>) => Promise<void>) => async () => {
      const c = await cible();
      try {
        await f(c.lire);
      } finally {
        await c.fermer();
      }
    };
    const indicateurs = async (lire: (c: string) => Promise<RetourVentes>, requete: string) => {
      const r = await lire('/ventes/indicateurs' + requete);
      expect(r.status).toBe(200);
      return (r.json as { body: Corps }).body;
    };

    it('indicateurs-du-mois', avec(async (lire) => {
      const c = await indicateurs(lire, '?mois=2026-01');
      expect(c.chiffreAffaires.pieces.length).toBeGreaterThan(0);
      expect(c.aEncaisser.pieces.length).toBeGreaterThan(0);
      expect(Number.isInteger(c.aEncaisser.montantCentimes)).toBe(true);
      expect(c.provisoire).toBe(false);
    }));
    it('propositions-rendent-provisoire', avec(async (lire) => {
      expect((await indicateurs(lire, '?mois=2026-01&avecPropositions=true')).provisoire).toBe(true);
    }));
    it('regime-non-confirme-aucune-tva-collectee', avec(async (lire) => {
      expect((await indicateurs(lire, '?mois=2026-01')).tvaCollectee).toEqual({ nonCalculee: 'regime_a_confirmer' });
    }));
    it('mois-sans-ventes-tout-a-zero', avec(async (lire) => {
      const c = await indicateurs(lire, '?mois=1999-01');
      expect([c.chiffreAffaires.montantCentimes, c.tvaEnAttente.montantCentimes]).toEqual([0, 0]);
      expect(c.chiffreAffaires.pieces).toEqual([]);
    }));
    it('mois-invalide-400', avec(async (lire) => {
      for (const q of ['', '?mois=2026-00', '?mois=2026-13', '?mois=2026-1', '?mois=abc', '?mois=2026-01&avecPropositions=oui'])
        expect((await lire('/ventes/indicateurs' + q)).status, q).toBe(400);
    }));
    it('series-trous-et-doublons', avec(async (lire) => {
      const r = await lire('/ventes/series');
      expect(r.status).toBe(200);
      const series = (r.json as { body: Serie[] }).body;
      expect(series.length).toBeGreaterThan(0);
      expect(series.some((s) => s.trous.includes(17))).toBe(true);
    }));
    it('series-pas-prise-pour-un-identifiant', avec(async (lire) => {
      for (const chemin of ['/ventes/series', '/ventes/indicateurs?mois=2026-01']) {
        const r = await lire(chemin);
        expect([r.status, (r.json as { code?: string }).code]).not.toEqual([404, 'VENTE_INCONNUE']);
        expect(r.status).toBe(200);
      }
      expect((await lire('/ventes/VP-9-999')).status).toBe(404);
    }));
  });
}
