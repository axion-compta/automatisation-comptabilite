import { describe, expect, it } from 'vitest';
import { aNouveauxProvisoires, definitifSiCloture, ErreurANouveaux, fecOfficielAutorise, recalculer, type SoldeCompte } from '../a-nouveaux.js';

const PLAN = ['101000', '120000', '129000', '215000', '401000', '411000', '512000', '606000', '706000'];
// Soldes fictifs de N (débit moins crédit) : la balance est équilibrée (somme nulle).
const SOLDES_N: SoldeCompte[] = [
  { compte: '101000', solde: -100000 },
  { compte: '215000', solde: 40000 },
  { compte: '411000', solde: 30000 },
  { compte: '512000', solde: 50000 },
  { compte: '401000', solde: -15000 },
  { compte: '606000', solde: 20000 },
  { compte: '706000', solde: -25000 },
];
const code = (f: () => unknown): string => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurANouveaux);
    return (e as ErreurANouveaux).code;
  }
  return 'aucune_erreur';
};
const somme = (l: { debit: number; credit: number }[], k: 'debit' | 'credit'): number => l.reduce((s, x) => s + x[k], 0);

describe('à-nouveaux de N+1', () => {
  it('a-nouveaux-marques-provisoires', () => {
    const a = aNouveauxProvisoires(SOLDES_N, PLAN);
    expect(a.statut).toBe('provisoire');
    expect(a.lignes.map((l) => l.compte)).toEqual(['101000', '120000', '215000', '401000', '411000', '512000']);
    // le résultat de N (25 000 - 20 000 = 5 000 de bénéfice) passe au compte 120000, au crédit
    expect(a.lignes.find((l) => l.compte === '120000')).toEqual({ compte: '120000', debit: 0, credit: 5000 });
    expect(a.lignes.find((l) => l.compte === '411000')).toEqual({ compte: '411000', debit: 30000, credit: 0 });
    expect(a.lignes.find((l) => l.compte === '401000')).toEqual({ compte: '401000', debit: 0, credit: 15000 });
    expect(somme(a.lignes, 'debit')).toBe(somme(a.lignes, 'credit'));
    expect(a.totalDebit).toBe(somme(a.lignes, 'debit'));
    expect(a.totalCredit).toBe(somme(a.lignes, 'credit'));
  });

  it('perte-au-compte-129-et-solde-nul-ignore', () => {
    const perte = aNouveauxProvisoires(
      [{ compte: '512000', solde: 1000 }, { compte: '606000', solde: 4000 }, { compte: '101000', solde: -5000 }, { compte: '411000', solde: 0 }],
      PLAN,
    );
    expect(perte.lignes.find((l) => l.compte === '129000')).toEqual({ compte: '129000', debit: 4000, credit: 0 });
    expect(perte.lignes.some((l) => l.compte === '411000')).toBe(false);
    expect(somme(perte.lignes, 'debit')).toBe(somme(perte.lignes, 'credit'));
    expect(aNouveauxProvisoires([], PLAN).lignes).toEqual([]);
    // un solde déjà présent au 120000 s'additionne au résultat de N
    const deja = aNouveauxProvisoires([{ compte: '120000', solde: -3000 }, { compte: '512000', solde: 8000 }, { compte: '706000', solde: -5000 }], PLAN);
    expect(deja.lignes.find((l) => l.compte === '120000')).toEqual({ compte: '120000', debit: 0, credit: 8000 });
  });

  it('refus-balance-desequilibree-compte-hors-plan-montant-invalide', () => {
    expect(code(() => aNouveauxProvisoires([{ compte: '512000', solde: 100 }], PLAN))).toBe('balance_desequilibree');
    expect(code(() => aNouveauxProvisoires([{ compte: '999999', solde: 0 }], PLAN))).toBe('compte_hors_plan');
    expect(code(() => aNouveauxProvisoires([{ compte: '512000', solde: 1.5 }], PLAN))).toBe('montant_invalide');
    expect(code(() => aNouveauxProvisoires([{ compte: '512000', solde: Number.NaN }], PLAN))).toBe('montant_invalide');
    expect(code(() => aNouveauxProvisoires([{ compte: '8x', solde: 0 }], ['8x']))).toBe('compte_invalide');
    expect(code(() => aNouveauxProvisoires([{ compte: '801000', solde: 0 }], ['801000']))).toBe('compte_invalide');
  });

  it('ecriture-validee-en-n-recalcule-a-nouveaux', () => {
    const ancien = aNouveauxProvisoires(SOLDES_N, PLAN);
    // une facture client de 12 000 validée en N : 411000 au débit, 706000 au crédit
    const apres = SOLDES_N.map((s) => (s.compte === '411000' ? { ...s, solde: s.solde + 12000 } : s.compte === '706000' ? { ...s, solde: s.solde - 12000 } : s));
    const r = recalculer(ancien, aNouveauxProvisoires(apres, PLAN));
    expect(r.modifie).toBe(true);
    expect(r.differences).toEqual([
      { compte: '120000', avant: { debit: 0, credit: 5000 }, apres: { debit: 0, credit: 17000 } },
      { compte: '411000', avant: { debit: 30000, credit: 0 }, apres: { debit: 42000, credit: 0 } },
    ]);
    expect(r.nouveau.statut).toBe('provisoire');
    const identique = recalculer(ancien, aNouveauxProvisoires(SOLDES_N, PLAN));
    expect(identique.modifie).toBe(false);
    expect(identique.differences).toEqual([]);
  });

  it('recalcul-trace', () => {
    const ancien = aNouveauxProvisoires(SOLDES_N, PLAN);
    const nouveau = aNouveauxProvisoires(SOLDES_N.map((s) => (s.compte === '512000' ? { ...s, solde: 60000 } : s.compte === '101000' ? { ...s, solde: -110000 } : s)), PLAN);
    const r = recalculer(ancien, nouveau, 'ecriture_validee_en_n');
    expect(r.trace).toEqual({ avant: { totalDebit: 120000, totalCredit: 120000 }, apres: { totalDebit: 130000, totalCredit: 130000 }, cause: 'ecriture_validee_en_n' });
    expect(recalculer(ancien, nouveau).trace.cause).toBe('ecriture_validee_en_n');
    expect(recalculer(ancien, nouveau, 'ecriture_modifiee_en_n').trace.cause).toBe('ecriture_modifiee_en_n');
    const sans = aNouveauxProvisoires([{ compte: '101000', solde: -100000 }, { compte: '215000', solde: 40000 }, { compte: '401000', solde: -15000 }, { compte: '512000', solde: 75000 }], PLAN);
    expect(recalculer(ancien, sans).differences.find((x) => x.compte === '411000')).toEqual({ compte: '411000', avant: { debit: 30000, credit: 0 }, apres: { debit: 0, credit: 0 } });
  });

  it('n-cloture-a-nouveaux-definitifs', () => {
    const a = aNouveauxProvisoires(SOLDES_N, PLAN);
    for (const statut of ['ouvert', 'en_cloture', 'rouvert'] as const) expect(definitifSiCloture(a, statut).statut).toBe('provisoire');
    const f = definitifSiCloture(a, 'cloture');
    expect(f.statut).toBe('definitif');
    expect(f.lignes).toEqual(a.lignes);
    expect(code(() => recalculer(f, a))).toBe('a_nouveaux_definitifs');
    expect(code(() => definitifSiCloture(a, 'autre' as never))).toBe('statut_inconnu');
  });

  it('fec-officiel-n-plus-1-refuse-n-ouvert', () => {
    const n1 = { debut: '2027-01-01', statut: 'cloture' as const };
    for (const statut of ['ouvert', 'en_cloture', 'rouvert'] as const) {
      expect(fecOfficielAutorise(n1, { fin: '2026-12-31', statut })).toEqual({ ok: false, code: 'exercice_precedent_ouvert' });
    }
    expect(fecOfficielAutorise(n1, { fin: '2026-12-31', statut: 'cloture' })).toEqual({ ok: true });
    expect(fecOfficielAutorise(n1, undefined)).toEqual({ ok: true });
    // N doit finir avant le début de N+1 (frontière : même jour refusé)
    expect(code(() => fecOfficielAutorise(n1, { fin: '2027-01-01', statut: 'cloture' }))).toBe('exercices_non_consecutifs');
    expect(code(() => fecOfficielAutorise(n1, { fin: '2026-12-31', statut: 'x' as never }))).toBe('statut_inconnu');
  });
});
