import { describe, expect, it } from 'vitest';
import { genererVuesBanque } from '../../../donnees-fictives/src/banque-vues.js';
import { creerServiceTresorerie } from '../domaines/tresorerie-service.js';
import { ReponseAlertesIban, ReponseEcheancesFournisseurs, ReponseFlux, ReponsePrevision, QueryPrevision } from '../domaines/tresorerie.js';

const v = genererVuesBanque();
const s = creerServiceTresorerie();
const cumul = (ids: string[]) => ids.reduce((t, id) => t + (v.flux.find((f) => f.id === id)?.montant ?? 0), v.soldesDepart[0]!.solde);

describe('trésorerie en mémoire', () => {
  it('prevision-centrale-t11-1', () => {
    const r = s.prevision(30, 'central');
    expect(ReponsePrevision.parse(r)).toEqual(r);
    expect(r.body.soldeDepartCentimes).toBe(v.soldesDepart[0]!.solde);
    expect(r.body.points.length).toBeGreaterThan(0);
    const dates = r.body.points.map((p) => p.date);
    expect(dates).toEqual([...dates].sort());
    const dernier = r.body.points[r.body.points.length - 1]!;
    expect(dernier.soldeCentimes).toBe(cumul(v.flux.map((f) => f.id)));
    expect(dernier.fluxIds).toContain('FX-004');
  });

  it('prevision-prudente-t11-2', () => {
    const r = s.prevision(30, 'prudent');
    const ids = r.body.points.flatMap((p) => p.fluxIds);
    expect(ids).not.toContain('FX-002');
    const dernier = r.body.points[r.body.points.length - 1]!;
    expect(dernier.soldeCentimes).toBe(cumul(v.flux.filter((f) => f.origine !== 'clients').map((f) => f.id)));
    expect(dernier.soldeCentimes).toBeLessThan(s.prevision(30, 'central').body.points.at(-1)!.soldeCentimes);
  });

  it('estimation-et-hypotheses-toujours', () => {
    for (const h of [30, 60, 90] as const)
      for (const sc of ['central', 'prudent'] as const) {
        const r = s.prevision(h, sc).body;
        expect(r.estimation).toBe(true);
        expect(r.hypotheses.length).toBeGreaterThan(0);
        expect(r.alerte).toBe(r.points.some((p) => p.soldeCentimes < r.seuilBasCentimes));
      }
    expect(s.prevision(30, 'central').body.hypotheses).not.toEqual(s.prevision(30, 'prudent').body.hypotheses);
    expect(() => ReponsePrevision.parse({ body: { ...s.prevision(30, 'central').body, hypotheses: [] } })).toThrow();
    expect(() => ReponsePrevision.parse({ body: { ...s.prevision(30, 'central').body, estimation: false } })).toThrow();
  });

  it('horizon-hors-liste-refuse', () => {
    for (const h of [0, 45, NaN, Infinity, 30.5, -30, '', 'abc']) expect(QueryPrevision.safeParse({ horizon: h }).success).toBe(false);
    expect(QueryPrevision.safeParse({ horizon: 'NaN' }).success).toBe(false);
    expect(QueryPrevision.safeParse({ horizon: '60', scenario: 'inconnu' }).success).toBe(false);
    expect(QueryPrevision.parse({ horizon: '90', scenario: 'prudent' })).toEqual({ horizon: 90, scenario: 'prudent' });
  });

  it('flux-filtre-dates', () => {
    const tout = s.flux({});
    expect(ReponseFlux.parse(tout)).toEqual(tout);
    expect(tout.body).toHaveLength(v.flux.length);
    expect(s.flux({ du: '2026-11-10', au: '2026-11-15' }).body.map((f) => f.id)).toEqual(['FX-001', 'FX-002']);
    expect(s.flux({ origine: 'tva' }).body.map((f) => f.id)).toEqual(['FX-004']);
    expect(s.flux({ du: '2026-12-01', au: '2026-11-01' })).toEqual({ body: [] });
  });

  it('echeances-t13-1-sans-iban-change', () => {
    const r = s.echeances();
    expect(ReponseEcheancesFournisseurs.parse(r)).toEqual(r);
    const ids = r.body.map((e) => e.pieceId);
    expect(ids).toEqual(['P-DET-001', 'P-DET-003']);
    expect(ids).not.toContain('P-DET-002');
    expect(r.body.every((e) => !e.ibanChange && e.ibanMasque.includes('•'))).toBe(true);
    expect(s.echeances(30).body.map((e) => e.pieceId)).toEqual(['P-DET-001']);
    expect(s.echeances(1).body).toEqual([]);
  });

  it('alertes-iban-une', () => {
    const r = s.alertesIban();
    expect(ReponseAlertesIban.parse(r)).toEqual(r);
    expect(r.body).toHaveLength(1);
    expect(r.body[0]).toMatchObject({ pieceId: 'P-DET-002', resteCentimes: 83040 });
  });
});
