import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { echeanceDepassee, etatAffiche, type DemandeEtat } from '../etat.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const ref = '2032-05-10';
const base: DemandeEtat = { statutPiece: 'validee', statutEcriture: 'valide', resteDu: centimes(1000), echeance: '2032-06-01', dateReference: ref, enLitige: false, lettrage: 'aucun' };
type Ecart = { [K in keyof DemandeEtat]?: DemandeEtat[K] | undefined };
const e = (p: Ecart): string => etatAffiche({ ...base, ...p } as DemandeEtat);

describe('etat affiche', () => {
  it('etat-doublon', () => {
    expect(e({ statutPiece: 'doublon' })).toBe('doublon');
  });
  it('etat-a-relire', () => {
    expect(e({ statutPiece: 'a_verifier' })).toBe('a_relire');
    expect(e({ statutPiece: 'lue' })).toBe('a_relire');
  });
  it('etat-en-litige', () => {
    expect(e({ enLitige: true })).toBe('en_litige');
  });
  it('etat-proposee', () => {
    expect(e({ statutEcriture: undefined })).toBe('proposee');
    expect(e({ statutEcriture: 'brouillon' })).toBe('proposee');
    expect(e({ statutEcriture: 'propose', statutPiece: 'proposee' })).toBe('proposee');
  });
  it('etat-payee', () => {
    expect(e({ resteDu: centimes(0), lettrage: 'total' })).toBe('payee');
    expect(e({ resteDu: centimes(0), echeance: '2032-01-01' })).toBe('payee');
  });
  it('etat-en-retard', () => {
    expect(e({ echeance: '2032-05-09' })).toBe('en_retard');
  });
  it('etat-payee-en-partie', () => {
    expect(e({ lettrage: 'partiel' })).toBe('payee_en_partie');
  });
  it('etat-a-encaisser', () => {
    expect(e({})).toBe('a_encaisser');
    expect(e({ echeance: undefined })).toBe('a_encaisser');
    expect(e({ lettrage: 'total' })).toBe('a_encaisser');
  });
  it('priorites-croisees', () => {
    expect(e({ statutPiece: 'doublon', enLitige: true })).toBe('doublon');
    expect(e({ statutPiece: 'doublon', statutEcriture: undefined })).toBe('doublon');
    expect(e({ statutPiece: 'a_verifier', enLitige: true })).toBe('a_relire');
    expect(e({ enLitige: true, echeance: '2032-05-09' })).toBe('en_litige');
    expect(e({ enLitige: true, statutEcriture: 'brouillon' })).toBe('en_litige');
    expect(e({ statutEcriture: 'brouillon', resteDu: centimes(0) })).toBe('proposee');
    expect(e({ lettrage: 'partiel', echeance: '2032-05-09' })).toBe('en_retard');
  });
  it('echeance-le-jour-meme-pas-en-retard', () => {
    expect(echeanceDepassee(ref, ref)).toBe(false);
    expect(echeanceDepassee('2032-05-09', ref)).toBe(true);
    expect(echeanceDepassee('2032-05-11', ref)).toBe(false);
    expect(echeanceDepassee(undefined, ref)).toBe(false);
    expect(e({ echeance: ref })).toBe('a_encaisser');
  });
  it('entrees-invalides', () => {
    for (const r of [Number.NaN, Infinity, -Infinity, 1.5, -1, 2 ** 53]) {
      expect(code(() => e({ resteDu: r as never }))).toBe('reste_du_invalide');
    }
    expect(code(() => e({ statutPiece: 'x' as never }))).toBe('statut_invalide');
    expect(code(() => e({ dateReference: '2032-13-01' }))).toBe('date_invalide');
    expect(code(() => e({ echeance: 'abc' }))).toBe('date_invalide');
    expect(code(() => echeanceDepassee('2032-05-09', ''))).toBe('date_invalide');
  });
});
