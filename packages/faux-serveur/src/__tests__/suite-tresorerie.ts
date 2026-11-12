import { describe, expect, it } from 'vitest';
import { ReponseAlertesIban, ReponseEcheancesFournisseurs, ReponseFlux, ReponsePrevision } from '../../../contrat/src/domaines/tresorerie.js';
import type { Cible } from './suite-contrat.js';

type Prevision = { estimation: boolean; soldeDepartCentimes: number; points: Array<{ date: string; soldeCentimes: number; fluxIds: string[] }>; alerte: boolean; hypotheses: string[] };
const HORIZON_HORS_LISTE = 'horizon=45';

/** Suite commune « trésorerie, fournisseurs à payer, alertes IBAN » : jouée sur le vrai serveur et sur le faux. */
export function suiteTresorerie(nom: string, cible: Cible): void {
  describe('suite trésorerie commune : ' + nom, () => {
    const lire = async (chemin: string) => {
      const c = await cible();
      try {
        return await c.appeler('GET', chemin);
      } finally {
        await c.fermer();
      }
    };
    const prevision = async (query: string) => (await lire('/tresorerie/prevision' + query)).json as { body: Prevision };
    const ids = (r: { json: unknown }) => (r.json as { body: Array<{ pieceId: string }> }).body.map((x) => x.pieceId);

    it('prevision-centrale', async () => {
      const r = await lire('/tresorerie/prevision?scenario=central');
      expect(r.status).toBe(200);
      expect(ReponsePrevision.safeParse(r.json).success).toBe(true);
      const { body } = r.json as { body: Prevision };
      expect(body.soldeDepartCentimes).toBe(1840000);
      expect(body.points.map((p) => [p.date, p.soldeCentimes])).toEqual([
        ['2026-11-05', 1690000],
        ['2026-11-10', 1270000],
        ['2026-11-15', 1870000],
        ['2026-11-23', 1640000],
      ]);
      expect(body.points[2]!.fluxIds).toEqual(['FX-002']);
      expect(body.alerte).toBe(false);
      expect((await prevision('')).body.points).toEqual(body.points);
    });

    it('prevision-prudente', async () => {
      const { body } = await prevision('?scenario=prudent');
      expect(body.points.map((p) => p.soldeCentimes)).toEqual([1690000, 1270000, 1040000]);
      expect(body.points.flatMap((p) => p.fluxIds)).not.toContain('FX-002');
      expect(body.hypotheses.length).toBeGreaterThan((await prevision('?scenario=central')).body.hypotheses.length);
    });

    it('estimation-toujours-presente', async () => {
      for (const q of ['', '?scenario=prudent', '?horizon=60', '?horizon=90&scenario=prudent']) {
        const { body } = await prevision(q);
        expect([q, body.estimation]).toEqual([q, true]);
        expect(body.hypotheses.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('horizon-refuse', async () => {
      for (const q of [HORIZON_HORS_LISTE, 'horizon=0', 'horizon=-30', 'horizon=NaN', 'horizon=Infinity', 'horizon=30.5', 'horizon=', 'horizon=30&scenario=autre', 'scenario=', 'scenario=inconnu', 'inconnu=1']) {
        const r = await lire('/tresorerie/prevision?' + q);
        expect([q, r.status]).toEqual([q, 400]);
      }
      expect((await lire('/fournisseurs/echeances?horizon=0')).status).toBe(400);
      expect((await lire('/fournisseurs/echeances?horizon=NaN')).status).toBe(400);
      expect((await lire('/tresorerie/flux?du=pas-une-date')).status).toBe(400);
    });

    it('flux-filtres-et-ordre-inverse', async () => {
      const r = await lire('/tresorerie/flux');
      expect(ReponseFlux.safeParse(r.json).success).toBe(true);
      const dates = (r.json as { body: Array<{ date: string }> }).body.map((f) => f.date);
      expect(dates).toEqual([...dates].sort());
      expect(dates).toHaveLength(4);
      expect((await lire('/tresorerie/flux?du=2026-11-15&au=2026-11-23')).json).toMatchObject({ body: [{ id: 'FX-002' }, { id: 'FX-004' }] });
      expect((await lire('/tresorerie/flux?du=2026-12-01&au=2026-11-01')).json).toEqual({ body: [] });
      expect((await lire('/tresorerie/flux?origine=tva')).json).toMatchObject({ body: [{ id: 'FX-004' }] });
      expect((await lire('/tresorerie/flux?origine=absente')).json).toEqual({ body: [] });
    });

    it('echeances-sans-iban-change', async () => {
      const r = await lire('/fournisseurs/echeances');
      expect(r.status).toBe(200);
      expect(ReponseEcheancesFournisseurs.safeParse(r.json).success).toBe(true);
      expect(ids(r)).toEqual(['P-DET-001', 'P-DET-003']);
      expect((r.json as { body: Array<{ ibanChange: boolean }> }).body.every((e) => !e.ibanChange)).toBe(true);
      expect(ids(await lire('/fournisseurs/echeances?horizon=30'))).toEqual(['P-DET-001']);
      expect(ids(await lire('/fournisseurs/echeances?horizon=1'))).toEqual([]);
    });

    it('alertes-iban', async () => {
      const r = await lire('/fournisseurs/alertes-iban');
      expect(r.status).toBe(200);
      expect(ReponseAlertesIban.safeParse(r.json).success).toBe(true);
      expect(r.json).toMatchObject({ body: [{ pieceId: 'P-DET-002', resteCentimes: 83040 }] });
      expect(ids(r)).not.toContain('P-DET-001');
    });
  });
}
