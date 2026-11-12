import { describe, expect, it } from 'vitest';
import { ErreurConservation, conserverJusquAu, estCategorieComptable, etendreReglesBancaires, purgePossible, type RegleConservation, type ResultatConservation } from '../regles.js';

const r = (o: Partial<RegleConservation> = {}): RegleConservation => ({
  pays: 'AA', categorie: 'pieces', dureeAnnees: 7, pointDepart: 'cloture_exercice', statut: 'valide', source: 'test', ...o,
});
const dates = { cloture_exercice: '2026-03-31', date_document: '2026-01-10', fin_contrat: '2026-06-30' };
const q = (regles: RegleConservation[], pays = ['AA'], d: Record<string, string> = dates) =>
  conserverJusquAu(regles, { pays, categorie: 'pieces', dates: d });
const attendu = (raison: string) => ({ etat: 'a_confirmer', raison });
const date = (x: ResultatConservation) => (x.etat === 'date' ? x.date : x.raison);
const dateBb: ResultatConservation = { etat: 'date', date: '2030-01-01', regle: r() };

describe('conservation', () => {
  it('date-depuis-la-cloture', () => {
    expect(date(q([r()]))).toBe('2033-03-31');
  });
  it('plus-longue-gagne', () => {
    const res = q([r(), r({ dureeAnnees: 3 }), r({ dureeAnnees: 9, pointDepart: 'date_document' })]);
    expect(date(res)).toBe('2035-01-10');
    expect(date(q([r({ dureeAnnees: 3 }), r()]))).toBe('2033-03-31');
  });
  it('deux-pays-plus-longue-gagne', () => {
    const regles = [r(), r({ pays: 'BB', dureeAnnees: 3 }), r({ pays: 'CC', dureeAnnees: 50 })];
    expect(date(q(regles, ['AA', 'BB']))).toBe('2033-03-31');
    expect(date(q(regles, ['BB']))).toBe('2029-03-31');
  });
  it.each([null, Number.NaN, Infinity, -1, 2.5])('duree-vide-a-confirmer %s', (d) => {
    expect(q([r({ dureeAnnees: d })])).toEqual(attendu('duree_vide'));
    expect(q([r(), r({ dureeAnnees: d })])).toEqual(attendu('duree_vide'));
  });
  it('duree-vide-a-confirmer : zéro an et débordement', () => {
    expect(date(q([r({ dureeAnnees: 0 })]))).toBe('2026-03-31');
    expect(q([r({ dureeAnnees: 9000 })])).toEqual(attendu('duree_vide'));
  });
  it.each(['non_verifie', 'a_verifier'] as const)('non-verifie-a-confirmer %s', (statut) => {
    expect(q([r({ statut })])).toEqual(attendu('non_verifie'));
    expect(q([r(), r({ statut, dureeAnnees: 3 })])).toEqual(attendu('non_verifie'));
  });
  it('cas-limites-regles', () => {
    expect(q([])).toEqual(attendu('aucune_regle'));
    expect(q([r()], ['BB'])).toEqual(attendu('aucune_regle'));
    expect(q([r()], [])).toEqual(attendu('aucune_regle'));
    expect(q([r()], ['AA'], {})).toEqual(attendu('date_depart_absente'));
    expect(q([r()], ['AA'], { cloture_exercice: '2026-02-30' })).toEqual(attendu('date_depart_absente'));
    expect(() => q([r()], ['aa'])).toThrow(ErreurConservation);
    expect(() => q([r({ pays: 'aa' })])).toThrow(ErreurConservation);
    expect(q([r({ categorie: 'sauvegardes' })])).toEqual(attendu('aucune_regle'));
  });
  it('29-fevrier', () => {
    expect(date(q([r({ dureeAnnees: 1 })], ['AA'], { cloture_exercice: '2028-02-29' }))).toBe('2029-02-28');
  });
  it('gel-bloque-meme-si-echu', () => {
    const gel = { gels: [{ pose_le: '2040-01-01' }, { pose_le: '2030-01-01' }], aujourdhui: '2035-01-01' };
    expect(purgePossible(dateBb, gel)).toEqual({ ok: false, code: 'gel_actif' });
    expect(purgePossible(attendu('duree_vide') as ResultatConservation, gel)).toEqual({ ok: false, code: 'gel_actif' });
    expect(purgePossible(dateBb, { gels: [{ pose_le: '2035-01-01' }], aujourdhui: '2035-01-01' }).ok).toBe(false);
    expect(purgePossible(dateBb, { gels: [{ pose_le: '2040-01-01' }], aujourdhui: '2035-01-01' })).toEqual({ ok: false, code: 'gel_actif' });
  });
  it('purge-trop-tot-refusee', () => {
    const ctx = (aujourdhui: string) => ({ gels: [], aujourdhui });
    expect(purgePossible(dateBb, ctx('2029-12-31'))).toEqual({ ok: false, code: 'trop_tot' });
    expect(purgePossible(dateBb, ctx('2030-01-01'))).toEqual({ ok: false, code: 'trop_tot' });
    expect(purgePossible(dateBb, ctx('2030-01-02'))).toEqual({ ok: true });
    expect(purgePossible(attendu('non_verifie') as ResultatConservation, ctx('2090-01-01'))).toEqual({ ok: false, code: 'a_confirmer' });
    expect(() => purgePossible(dateBb, ctx('2030-13-01'))).toThrow(ErreurConservation);
    expect(() => purgePossible(dateBb, { gels: [{ pose_le: 'x' }], aujourdhui: '2031-01-01' })).toThrow(ErreurConservation);
    expect(() => purgePossible(dateBb, { gels: [{ pose_le: '2030-01-01', leve_le: 'x' }], aujourdhui: '2031-01-01' })).toThrow(ErreurConservation);
  });
  it('gel-leve-n-empeche-plus', () => {
    const gels = [{ pose_le: '2030-01-01', leve_le: '2031-01-01' }];
    expect(purgePossible(dateBb, { gels, aujourdhui: '2031-06-01' })).toEqual({ ok: true });
    expect(purgePossible(dateBb, { gels, aujourdhui: '2031-01-01' })).toEqual({ ok: true });
    expect(purgePossible(dateBb, { gels, aujourdhui: '2030-12-31' })).toEqual({ ok: false, code: 'gel_actif' });
  });

  it.each(['releves_bancaires', 'rapprochements'] as const)('categorie-%s-meme-duree-que-les-pieces', (categorie) => {
    const base = [r(), r({ pays: 'BB', dureeAnnees: 3, pointDepart: 'date_document' })];
    const etendues = etendreReglesBancaires(base);
    const demande = (pays: string, regles: RegleConservation[]) => conserverJusquAu(regles, { pays: [pays], categorie, dates });
    expect(date(demande('AA', etendues))).toBe('2033-03-31');
    expect(date(demande('BB', etendues))).toBe('2029-01-10');
    expect(demande('AA', base)).toEqual(attendu('aucune_regle'));
    expect(etendues.slice(0, base.length)).toEqual(base);
    // Statut copié : une règle non vérifiée reste à confirmer.
    expect(demande('AA', etendreReglesBancaires([r({ statut: 'non_verifie' })]))).toEqual(attendu('non_verifie'));
    // Les pièces ne changent pas.
    expect(date(q(etendues))).toBe('2033-03-31');
  });
  it('categorie-releves', () => {
    expect(estCategorieComptable('releves_bancaires')).toBe(true);
    expect(estCategorieComptable('conversations')).toBe(false);
    // Règle explicite conservée, sans doublon.
    const explicite = r({ categorie: 'releves_bancaires', dureeAnnees: 10 });
    const etendues = etendreReglesBancaires([r(), explicite]);
    expect(etendues.filter((x) => x.categorie === 'releves_bancaires')).toEqual([explicite]);
    expect(etendues.filter((x) => x.categorie === 'rapprochements')).toHaveLength(1);
  });
  it('categorie-releves-regle-explicite-par-pays', () => {
    const explicite = r({ categorie: 'releves_bancaires', pays: 'BB', dureeAnnees: 10 });
    const etendues = etendreReglesBancaires([r(), r({ pays: 'BB', dureeAnnees: 3 }), explicite]);
    const releves = etendues.filter((x) => x.categorie === 'releves_bancaires');
    expect(releves).toHaveLength(2);
    expect(releves).toContainEqual(explicite);
    expect(releves).toContainEqual(r({ categorie: 'releves_bancaires', pays: 'AA' }));
  });
  it('categorie-rapprochements', () => {
    for (const c of ['fec_declarations', 'etats_pv', 'ecritures_livres'] as const) expect(estCategorieComptable(c)).toBe(true);
    for (const c of ['journal_actions', 'sauvegardes', 'signalements'] as const) expect(estCategorieComptable(c)).toBe(false);
    expect(estCategorieComptable('rapprochements')).toBe(true);
    expect(estCategorieComptable('pieces')).toBe(true);
    expect(etendreReglesBancaires([])).toEqual([]);
    expect(etendreReglesBancaires([r({ categorie: 'conversations' })])).toHaveLength(1);
  });
});
