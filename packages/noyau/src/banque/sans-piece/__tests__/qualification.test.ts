import { describe, expect, it } from 'vitest';
import { qualifier, ErreurQualification, type Contexte, type LigneAQualifier } from '../qualification.js';

const ctx: Contexte = {
  banquesDeLaSociete: ['banque-1'],
  creanciers: { 'creancier-impot': 'impot_taxe', 'creancier-social': 'social' },
  ibansAssocies: ['hache-assoc'],
  clientsConnus: ['client-1'],
  virementInterne: false,
};
const vide: Contexte = { banquesDeLaSociete: [], creanciers: {}, ibansAssocies: [], clientsConnus: [], virementInterne: false };
const l = (montant: number, extra: Partial<LigneAQualifier> = {}): LigneAQualifier => ({ montant: montant as LigneAQualifier['montant'], moyen: 'virement', ...extra });
const code = (fn: () => unknown): string => {
  try { fn(); } catch (e) { if (e instanceof ErreurQualification) return e.code; throw e; }
  return 'aucune';
};

describe('qualification des lignes sans pièce', () => {
  it('frais-banque-societe-sans-piece-requise', () => {
    const r = qualifier(l(-250, { moyen: 'frais', contrepartieId: 'banque-1' }), ctx);
    expect(r).toMatchObject({ etat: 'SANS_PIECE_REQUISE', proposition: 'frais' });
    expect(qualifier(l(-250, { moyen: 'frais', contrepartieId: 'autre-banque' }), ctx).etat).toBe('SANS_PIECE');
    expect(qualifier(l(-250, { moyen: 'carte', contrepartieId: 'banque-1' }), ctx).etat).toBe('SANS_PIECE');
  });

  it('creancier-impot-reconnu', () => {
    expect(qualifier(l(-90000, { creancier: 'creancier-impot' }), ctx)).toMatchObject({ etat: 'SANS_PIECE_REQUISE', proposition: 'impot' });
    expect(qualifier(l(-40000, { creancier: 'creancier-social' }), ctx)).toMatchObject({ etat: 'SANS_PIECE_REQUISE', proposition: 'social' });
    for (const c of ['creancier-inconnu', '', 'toString', '__proto__']) expect(qualifier(l(-100, { creancier: c }), ctx).etat).toBe('SANS_PIECE');
  });

  it('associe-toujours-a-qualifier', () => {
    expect(qualifier(l(500000, { ibanHache: 'hache-assoc' }), ctx)).toMatchObject({ etat: 'A_QUALIFIER', proposition: 'apport_associe' });
    expect(qualifier(l(-120000, { ibanHache: 'hache-assoc' }), ctx)).toMatchObject({ etat: 'A_QUALIFIER', proposition: 'remboursement_associe' });
    expect(qualifier(l(500000, { ibanHache: 'hache-assoc', contrepartieId: 'client-1' }), ctx).proposition).toBe('apport_associe');
  });

  it('t07-6-credit-inconnu-jamais-produit', () => {
    const r = qualifier(l(80000, { contrepartieId: 'inconnu' }), ctx);
    expect(r.etat).toBe('A_QUALIFIER');
    expect(r.proposition).toBeUndefined();
    expect(qualifier(l(80000), ctx).proposition).toBeUndefined();
    expect(qualifier(l(80000, { ibanHache: 'hache-autre' }), vide)).toMatchObject({ etat: 'A_QUALIFIER' });
  });

  it('acompte-client-connu', () => {
    expect(qualifier(l(30000, { contrepartieId: 'client-1' }), ctx)).toMatchObject({ etat: 'A_QUALIFIER', proposition: 'acompte_recu' });
    expect(qualifier(l(-30000, { contrepartieId: 'client-1' }), ctx).etat).toBe('SANS_PIECE');
  });

  it('debit-inconnu-sans-piece', () => {
    expect(qualifier(l(-4200, { contrepartieId: 'fournisseur-x' }), ctx)).toMatchObject({ etat: 'SANS_PIECE' });
    expect(qualifier(l(-4200), vide).etat).toBe('SANS_PIECE');
    expect(qualifier(l(-4200, { moyen: 'carte' }), ctx).proposition).toBeUndefined();
  });

  it('interne-prioritaire', () => {
    const interne = { ...ctx, virementInterne: true };
    for (const extra of [{}, { creancier: 'creancier-impot' }, { ibanHache: 'hache-assoc' }, { contrepartieId: 'client-1' }]) {
      expect(qualifier(l(50000, extra), interne)).toMatchObject({ etat: 'SANS_PIECE_REQUISE', proposition: 'interne' });
      expect(qualifier(l(-50000, extra), interne).proposition).toBe('interne');
    }
    expect(qualifier(l(-5, { moyen: 'frais', contrepartieId: 'banque-1' }), interne).proposition).toBe('interne');
  });

  it('virement-test-un-centime-associe', () => {
    expect(qualifier(l(1, { ibanHache: 'hache-assoc' }), ctx)).toMatchObject({ etat: 'A_QUALIFIER', proposition: 'apport_associe' });
    expect(qualifier(l(-1, { ibanHache: 'hache-assoc' }), ctx).etat).toBe('A_QUALIFIER');
  });

  it('montants-refuses-et-contexte-vide', () => {
    expect(code(() => qualifier(l(0), ctx))).toBe('montant_nul');
    for (const m of [NaN, Infinity, -Infinity, 1.5, -0.5]) expect(code(() => qualifier(l(m), ctx))).toBe('montant_invalide');
    expect(qualifier(l(-100), vide).etat).toBe('SANS_PIECE');
    expect(qualifier(l(100), vide).etat).toBe('A_QUALIFIER');
  });
});
