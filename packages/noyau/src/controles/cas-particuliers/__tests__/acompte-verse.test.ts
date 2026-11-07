import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import { verifierEcriture, type Ecriture } from '../../../ecritures/modele.js';
import { balance } from '../../../livres/balance.js';
import type { ParametreLu } from '../../regles/commun.js';
import { ecrituresAcompteVerse, imputationAcompte } from '../acompte-verse.js';

const c = (n: number): Centimes => n as Centimes;
const param = (statut: ParametreLu['statut']): ParametreLu => ({ cle: 'tva.acompte_verse_deductible', valeur: statut === 'absent' ? null : 'x', statut });
const COMPTES = { avance: '409100', tvaDeductible: '445660', banque: '512001' };
const COMPTES_IMP = { fournisseur: '401000', avance: '409100', tvaDeductible: '445660' };
const ID = 'ac-1';
const base = { date: '2026-04-10', journal: 'BQ' };
const verse = (ttc: number, tva: number, factureAcompte: boolean, p = param('valide')) =>
  ecrituresAcompteVerse({ id: ID, ttc: c(ttc), tva: c(tva), factureAcompte, parametre: p, comptes: COMPTES, ...base });
const propose = (r: ReturnType<typeof verse>): Ecriture => {
  if (r.etat !== 'propose') throw new Error('attendu : propose');
  return r.ecriture;
};
const imputer = (ttc: number, tva: number, avecTva: boolean): Ecriture =>
  imputationAcompte({ id: ID, acompte: { ttc: c(ttc), tva: c(tva), avecTva }, comptes: COMPTES_IMP, ...base });
const valide = (e: Ecriture): Ecriture => ({ ...e, statut: 'valide' });
const solde = (es: Ecriture[], compte: string): number => balance(es).lignes.find((l) => l.compte === compte)?.solde ?? 0;
const lignes = (e: Ecriture) => e.lignes.map((l) => [l.compte, l.debit, l.credit]);
const ENTREE_INVALIDE = expect.objectContaining({ code: 'entree_invalide' });

describe('acompte verse a un fournisseur', () => {
  it('CT-33', () => {
    const acompte = propose(verse(120000, 20000, false));
    expect(lignes(acompte)).toEqual([['409100', 120000, 0], ['512001', 0, 120000]]);
    const facture: Ecriture = {
      id: 'facture', journal: 'HA', date: '2026-05-01', statut: 'valide',
      lignes: [
        { compte: '604000', libelle: 'achat', debit: c(300000), credit: c(0) },
        { compte: '445660', libelle: 'tva', debit: c(60000), credit: c(0) },
        { compte: '401000', libelle: 'fournisseur', debit: c(0), credit: c(360000) },
      ],
    };
    const imputation = imputer(120000, 0, false);
    expect(lignes(imputation)).toEqual([['401000', 120000, 0], ['409100', 0, 120000]]);
    const tous = [valide(acompte), facture, valide(imputation)];
    expect(solde(tous, '409100')).toBe(0);
    expect(solde(tous, '401000')).toBe(-240000);
    expect(solde(tous, '445660')).toBe(60000);
  });

  it('avec-facture-d-acompte', () => {
    const acompte = propose(verse(120000, 20000, true));
    expect(lignes(acompte)).toEqual([['409100', 100000, 0], ['445660', 20000, 0], ['512001', 0, 120000]]);
    expect(lignes(imputer(120000, 20000, true))).toEqual([['401000', 120000, 0], ['409100', 0, 100000], ['445660', 0, 20000]]);
  });

  it('parametre-a-verifier-refuse', () => {
    for (const statut of ['a_verifier', 'non_verifie', 'absent'] as const) {
      expect(verse(120000, 20000, true, param(statut))).toEqual({ etat: 'refuse', code: 'parametre_non_valide' });
    }
    expect(verse(120000, 0, false, param('a_verifier')).etat).toBe('propose');
  });

  it('avance-soldee-dans-les-deux-cas', () => {
    for (const [ttc, tva, avecTva] of [[120000, 20000, true], [120000, 0, false]] as const) {
      const tous = [valide(propose(verse(ttc, tva, avecTva))), valide(imputer(ttc, tva, avecTva))];
      expect(solde(tous, '409100')).toBe(0);
      expect(solde(tous, '445660')).toBe(0);
      expect(solde(tous, '401000')).toBe(120000);
    }
  });

  it('tva-superieure-au-ttc-exception', () => {
    expect(() => verse(100, 101, true)).toThrowError(ENTREE_INVALIDE);
    expect(() => verse(100, 101, false)).toThrowError(ENTREE_INVALIDE);
    expect(() => imputer(100, 101, true)).toThrowError(ENTREE_INVALIDE);
    expect(() => verse(100, 100, true)).toThrow();
    expect(verse(100, 99, true).etat).toBe('propose');
  });

  it('montants-invalides', () => {
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1, 0]) {
      expect(() => verse(mauvais, 0, false)).toThrowError(ENTREE_INVALIDE);
      expect(() => imputer(mauvais, 0, false)).toThrowError(ENTREE_INVALIDE);
    }
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      expect(() => verse(1000, mauvais, true)).toThrowError(ENTREE_INVALIDE);
      expect(() => imputer(1000, mauvais, true)).toThrowError(ENTREE_INVALIDE);
    }
  });

  it('id-fourni-et-distinct', () => {
    const a = ecrituresAcompteVerse({ id: 'a1', ttc: c(100), tva: c(0), factureAcompte: false, parametre: param('valide'), comptes: COMPTES, ...base });
    const b = ecrituresAcompteVerse({ id: 'a2', ttc: c(100), tva: c(0), factureAcompte: false, parametre: param('valide'), comptes: COMPTES, ...base });
    expect([propose(a).id, propose(b).id]).toEqual(['a1', 'a2']);
    expect(imputationAcompte({ id: 'i1', acompte: { ttc: c(100), tva: c(0), avecTva: false }, comptes: COMPTES_IMP, ...base }).id).toBe('i1');
    expect(() => ecrituresAcompteVerse({ id: '', ttc: c(100), tva: c(0), factureAcompte: false, parametre: param('valide'), comptes: COMPTES, ...base })).toThrowError(ENTREE_INVALIDE);
    expect(() => imputationAcompte({ id: '', acompte: { ttc: c(100), tva: c(0), avecTva: false }, comptes: COMPTES_IMP, ...base })).toThrowError(ENTREE_INVALIDE);
  });

  it('jamais-validee', () => {
    expect(propose(verse(120000, 20000, true)).statut).toBe('propose');
    expect(propose(verse(120000, 0, false)).statut).toBe('propose');
    expect(imputer(120000, 20000, true).statut).toBe('propose');
    expect(imputer(120000, 0, false).statut).toBe('propose');
  });

  it('equilibre-1000-cas', () => {
    let graine = 987654;
    const suivant = (): number => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine;
    };
    for (let i = 0; i < 1000; i++) {
      const ttc = (suivant() % 10000000) + 2;
      const tva = suivant() % ttc;
      const avecTva = tva > 0 && i % 2 === 0;
      const t = avecTva ? tva : 0;
      const ecritures = [propose(verse(ttc, t, avecTva)), imputer(ttc, t, avecTva)];
      for (const e of ecritures) expect(verifierEcriture(e).equilibree).toBe(true);
      expect(solde(ecritures.map(valide), '409100')).toBe(0);
    }
  });
});
