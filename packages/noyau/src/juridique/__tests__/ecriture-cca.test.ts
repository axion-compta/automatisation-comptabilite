import { describe, expect, it } from 'vitest';
import { centimes as c } from '../../argent/index.js';
import { verifierEquilibre } from '../../ecritures/modele.js';
import { ErreurEcritureCca, proposerEcritureCca, type Convention, type DemandeEcritureCca, type ParametresEcritureCca } from '../ecriture-cca.js';

// Valeurs INVENTÉES (spec 14, I1 et I2) ; comptes fictifs.
const CPT_INT = 'CPT_INT';
const CPT_RET = 'CPT_RET';
const CPT_CC = 'CPT_CC';
const RETENUE_PHYSIQUE = 3140;
const RETENUE_DISPENSEE = 1860;
const BORNE_HAUTE = 10_000;
const ARCHIVEE: Convention = { id: 'CV1', type: 'compte_courant_remunere', statut: 'archivee' };
const P: ParametresEcritureCca = {
  retenueParStatut: { personne_physique: RETENUE_PHYSIQUE, personne_physique_dispensee: RETENUE_DISPENSEE },
  comptes: { interets: CPT_INT, retenue: CPT_RET, compteCourant: CPT_CC },
  arrondi: 'demi-superieur',
};
const demande = (d: Partial<DemandeEcritureCca> = {}): DemandeEcritureCca => ({
  convention: ARCHIVEE, interets: c(100_000), statutAssocie: 'personne_physique', date: '2026-12-31', journal: 'OD', id: 'E1', ...d,
});
const brouillon = (d: Partial<DemandeEcritureCca> = {}, p = P) => {
  const r = proposerEcritureCca(demande(d), p);
  if (r.etat !== 'brouillon') throw new Error('brouillon attendu');
  return r;
};
const code = (d: Partial<DemandeEcritureCca>, p = P): string | undefined => {
  try {
    proposerEcritureCca(demande(d), p);
  } catch (e) {
    if (e instanceof ErreurEcritureCca) return e.code;
    throw e;
  }
  return undefined;
};

describe('écriture brouillon des intérêts de compte courant (JUR-017)', () => {
  it('i1-retenue-31-400-net-68-600', () => {
    const r = brouillon();
    expect([r.retenue, r.net, r.cartes]).toEqual([31_400, 68_600, []]);
    expect(r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([[CPT_INT, 100_000, 0], [CPT_RET, 0, 31_400], [CPT_CC, 0, 68_600]]);
  });

  it('i1-184-jours-retenue-15-829-net-34-582', () => {
    const r = brouillon({ interets: c(50_411) });
    expect([r.retenue, r.net]).toEqual([15_829, 34_582]);
    expect(brouillon({ interets: c(50_411) }, { ...P, arrondi: 'superieur' }).retenue).toBe(15_830);
  });

  it('ecriture-equilibree-et-en-brouillon', () => {
    const e = brouillon().ecriture;
    expect([e.statut, e.id, e.journal, e.date]).toEqual(['brouillon', 'E1', 'OD', '2026-12-31']);
    expect(verifierEquilibre(e)).toMatchObject({ equilibree: true, totalDebit: 100_000, totalCredit: 100_000 });
  });

  it('sans-convention-bloque-zero-ecriture', () => {
    expect(proposerEcritureCca(demande({ convention: null }), P)).toEqual({ etat: 'bloque', carte: 'deposer_convention' });
  });

  it('convention-non-archivee-bloque', () => {
    for (const statut of ['declaree', 'traitee'] as const) {
      expect(proposerEcritureCca(demande({ convention: { ...ARCHIVEE, statut } }), P)).toEqual({ etat: 'bloque', carte: 'deposer_convention' });
    }
    expect(proposerEcritureCca(demande({ convention: { ...ARCHIVEE, type: 'autre' } }), P).etat).toBe('bloque');
  });

  it('i2-personne-morale-zero-retenue-et-carte', () => {
    const p = { ...P, retenueParStatut: { ...P.retenueParStatut, personne_morale: RETENUE_PHYSIQUE } };
    const r = brouillon({ statutAssocie: 'personne_morale' }, p);
    expect([r.retenue, r.net, r.cartes]).toEqual([0, 100_000, ['retenue_a_verifier']]);
    expect(r.ecriture.lignes.map((l) => l.compte)).toEqual([CPT_INT, CPT_CC]);
  });

  it('i2-dispense-retenue-18-600', () => {
    const r = brouillon({ statutAssocie: 'personne_physique_dispensee' });
    expect([r.retenue, r.net, r.cartes]).toEqual([18_600, 81_400, []]);
  });

  it('statut-inconnu-zero-retenue-et-carte', () => {
    const r = brouillon({ statutAssocie: 'inconnu' });
    expect([r.retenue, r.cartes]).toEqual([0, ['retenue_a_verifier']]);
    const sansTaux = brouillon({}, { ...P, retenueParStatut: {} });
    expect([sansTaux.retenue, sansTaux.cartes]).toEqual([0, ['retenue_a_verifier']]);
  });

  it('retenue totale : pas de ligne nette nulle ; retenue nulle : pas de ligne de retenue', () => {
    const totale = brouillon({}, { ...P, retenueParStatut: { personne_physique: BORNE_HAUTE } });
    expect([totale.net, totale.ecriture.lignes.map((l) => l.compte)]).toEqual([0, [CPT_INT, CPT_RET]]);
    const nulle = brouillon({}, { ...P, retenueParStatut: { personne_physique: 0 } });
    expect([nulle.cartes, nulle.ecriture.lignes.map((l) => l.compte)]).toEqual([[], [CPT_INT, CPT_CC]]);
  });

  it('cas limites : intérêts, taux et comptes refusés', () => {
    expect(code({ interets: c(0) })).toBe('interets_nuls');
    expect(code({ interets: c(-1) })).toBe('interets_invalides');
    for (const x of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(code({ interets: x as never }), String(x)).toBe('interets_invalides');
    for (const x of [-1, BORNE_HAUTE + 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code({}, { ...P, retenueParStatut: { personne_physique: x } }), String(x)).toBe('taux_invalide');
    }
    expect(code({}, { ...P, retenueParStatut: { personne_physique: BORNE_HAUTE } })).toBeUndefined();
    const { interets, retenue, compteCourant } = P.comptes;
    for (const comptes of [{ interets, retenue: interets, compteCourant }, { interets, retenue, compteCourant: retenue }, { interets, retenue, compteCourant: interets }]) {
      expect(code({}, { ...P, comptes }), JSON.stringify(comptes)).toBe('comptes_identiques');
    }
    expect(code({ convention: null, interets: c(0) })).toBe('interets_nuls');
  });
});
