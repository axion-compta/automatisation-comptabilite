import { describe, expect, it } from 'vitest';
import { ErreurDirigeant, proposerRemuneration } from '../remuneration.js';
import { verifierEcriture, type Ecriture } from '../../ecritures/modele.js';

const COMPTES = {
  remuneration: '641100', personnel: '421000', organismes: '431000',
  chargesSociales: '645100', exploitant: '108000', banque: '512000',
};
const CTX = { idBase: 'rem', date: '2026-11-30', journal: 'OD' };
const PAIE = { brut: 300000, retenues: 66000, net: 234000, chargesPatronales: 126000 };

const lg = (e?: Ecriture) =>
  e?.lignes.map((l) => [l.compte, l.debit, l.credit]);
const codeErreur = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurDirigeant ? e.code : 'autre';
  }
  return undefined;
};

describe('proposerRemuneration', () => {
  it('president-paie-importee', () => {
    const r = proposerRemuneration('president_sas', PAIE, COMPTES, CTX);
    expect(r).toHaveLength(2);
    const [e1, e2] = r;
    expect([e1?.id, e2?.id]).toEqual(['rem-1', 'rem-2']);
    expect([e1?.statut, e2?.statut, e1?.journal, e1?.date]).toEqual(['brouillon', 'brouillon', 'OD', '2026-11-30']);
    expect(lg(e1)).toEqual([
      ['641100', 300000, 0],
      ['421000', 0, 234000],
      ['431000', 0, 66000],
    ]);
    expect(lg(e2)).toEqual([
      ['645100', 126000, 0],
      ['431000', 0, 126000],
    ]);
    for (const e of r) verifierEcriture(e);
  });

  it('exploitant-prelevement-sans-charge', () => {
    const r = proposerRemuneration('exploitant_ei', { prelevement: 150000 }, COMPTES, CTX);
    expect(r).toHaveLength(1);
    expect(r[0]?.statut).toBe('brouillon');
    expect(lg(r[0])).toEqual([
      ['108000', 150000, 0],
      ['512000', 0, 150000],
    ]);
    expect(r.flatMap((e) => e.lignes).some((l) => l.compte === COMPTES.chargesSociales)).toBe(false);
  });

  it('gerant-sans-calcul-de-cotisation', () => {
    const r = proposerRemuneration('gerant_majoritaire_sarl', { remuneration: 200000 }, COMPTES, CTX);
    expect(r).toHaveLength(1);
    expect(r[0]?.statut).toBe('brouillon');
    expect(lg(r[0])).toEqual([
      ['641100', 200000, 0],
      ['421000', 0, 200000],
    ]);
  });

  it('paie-incoherente-refusee', () => {
    const f = (net: number) => () =>
      proposerRemuneration('president_sas', { ...PAIE, net }, COMPTES, CTX);
    expect(codeErreur(f(234001))).toBe('paie_incoherente');
    expect(codeErreur(f(233999))).toBe('paie_incoherente');
    expect(codeErreur(f(234000))).toBeUndefined();
  });

  it('charges-nulles-une-seule-ecriture', () => {
    const r = proposerRemuneration('president_sas', { ...PAIE, chargesPatronales: 0 }, COMPTES, CTX);
    expect(r).toHaveLength(1);
    expect(r[0]?.lignes).toHaveLength(3);
  });

  it('statut-inconnu-refuse', () => {
    const f = () => proposerRemuneration('associe' as never, { prelevement: 100 }, COMPTES, CTX);
    expect(codeErreur(f)).toBe('statut_dirigeant_inconnu');
    expect(codeErreur(() => proposerRemuneration('toString' as never, {} as never, COMPTES, CTX))).toBe(
      'statut_dirigeant_inconnu',
    );
  });

  it('montants-invalides', () => {
    for (const v of [-1, Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(codeErreur(() => proposerRemuneration('exploitant_ei', { prelevement: v }, COMPTES, CTX))).toBe(
        'montant_invalide',
      );
      expect(
        codeErreur(() => proposerRemuneration('gerant_majoritaire_sarl', { remuneration: v }, COMPTES, CTX)),
      ).toBe('montant_invalide');
      for (const champ of ['brut', 'retenues', 'net', 'chargesPatronales'] as const) {
        expect(
          codeErreur(() => proposerRemuneration('president_sas', { ...PAIE, [champ]: v }, COMPTES, CTX)),
        ).toBe('montant_invalide');
      }
    }
  });

  it('compte-manquant-refuse', () => {
    const sans: Record<string, string> = { ...COMPTES };
    delete sans['banque'];
    for (const c of [sans, { ...COMPTES, banque: '' }]) {
      expect(codeErreur(() => proposerRemuneration('exploitant_ei', { prelevement: 100 }, c, CTX))).toBe('compte_manquant');
    }
  });

  it('retenues-nulles-sans-ligne-organismes', () => {
    const r = proposerRemuneration(
      'president_sas',
      { brut: 1000, retenues: 0, net: 1000, chargesPatronales: 0 },
      COMPTES,
      CTX,
    );
    expect(r[0]?.lignes).toHaveLength(2);
  });
});
