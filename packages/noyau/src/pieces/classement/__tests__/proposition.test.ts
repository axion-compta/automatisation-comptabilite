import { describe, expect, it } from 'vitest';
import { type Centimes, centimes } from '../../../argent/index.js';
import { type PiecePourProposition, proposerEcriture } from '../proposition.js';

const c = (n: number): Centimes => centimes(n);
const COMPTES = { charge: 'C-EXEMPLE', tvaDeductible: 'T-EXEMPLE', fournisseur: 'F-EXEMPLE' };
const taux = (tauxPdb: number, ht: number, tva: number) => ({ tauxPdb, ht: c(ht), tva: c(tva) });
const piece = (extra: Partial<PiecePourProposition> = {}): PiecePourProposition => ({
  id: 'p-1', sha256: 'empreinte-1', type: 'facture', comptee: true, sensible: false, classementAutomatiquePermis: true, aVerifier: [],
  date: '2026-01-15', journal: 'AC', parTaux: [taux(1900, 100000, 19000)], ttc: c(119000), ...extra,
});
const lignes = (p: PiecePourProposition) => {
  const r = proposerEcriture(p, COMPTES);
  if (!('ecriture' in r)) throw new Error(`aucune: ${r.aucune}`);
  expect(r.ecriture.statut).toBe('brouillon');
  return r.ecriture.lignes.map((l) => [l.compte, l.libelle, l.debit, l.credit]);
};
const aucune = (p: PiecePourProposition) => proposerEcriture(p, COMPTES);

describe('proposition', () => {
  it('facture-un-taux', () => {
    expect(lignes(piece())).toEqual([['C-EXEMPLE', 'charge', 100000, 0], ['T-EXEMPLE', 'tva@1900', 19000, 0], ['F-EXEMPLE', 'fournisseur', 0, 119000]]);
    const r = proposerEcriture(piece(), COMPTES);
    expect(r).toMatchObject({ cleIdempotence: 'empreinte-1:facture', ecriture: { journal: 'AC', date: '2026-01-15' } });
  });
  it('facture-trois-taux-inventes', () => {
    const p = piece({ parTaux: [taux(600, 10000, 600), taux(1100, 5000, 550), taux(1900, 20000, 3800)], ttc: c(39950) });
    expect(lignes(p)).toEqual([
      ['C-EXEMPLE', 'charge', 35000, 0], ['T-EXEMPLE', 'tva@600', 600, 0], ['T-EXEMPLE', 'tva@1100', 550, 0], ['T-EXEMPLE', 'tva@1900', 3800, 0], ['F-EXEMPLE', 'fournisseur', 0, 39950],
    ]);
  });
  it('avoir-sens-inverses', () => {
    const p = piece({ type: 'avoir', parTaux: [taux(1900, -100000, -19000)], ttc: c(-119000) });
    expect(lignes(p)).toEqual([['C-EXEMPLE', 'charge', 0, 100000], ['T-EXEMPLE', 'tva@1900', 0, 19000], ['F-EXEMPLE', 'fournisseur', 119000, 0]]);
    expect(aucune(piece({ type: 'avoir', parTaux: [taux(1900, 100000, -19000)], ttc: c(-119000) }))).toEqual({ aucune: 'desequilibre' });
    expect(aucune(piece({ parTaux: [taux(1900, -100000, -19000)] }))).toEqual({ aucune: 'desequilibre' });
  });
  it('taux-a-tva-nulle-sans-ligne', () => {
    const p = piece({ parTaux: [taux(0, 10000, 0), taux(1900, 10000, 1900)], ttc: c(21900) });
    expect(lignes(p)).toEqual([['C-EXEMPLE', 'charge', 20000, 0], ['T-EXEMPLE', 'tva@1900', 1900, 0], ['F-EXEMPLE', 'fournisseur', 0, 21900]]);
    expect(lignes(piece({ parTaux: [taux(0, 5000, 0)], ttc: c(5000) }))).toHaveLength(2);
  });
  it('non-comptee-aucune', () => {
    expect(aucune(piece({ comptee: false }))).toEqual({ aucune: 'non_comptee' });
    expect(aucune(piece({ type: 'plusieurs_factures' }))).toEqual({ aucune: 'plusieurs_factures' });
    expect(aucune(piece({ aVerifier: ['ecart_arithmetique'] }))).toEqual({ aucune: 'a_verifier' });
    expect(aucune(piece({ parTaux: [] }))).toEqual({ aucune: 'vide' });
  });
  it('sensible-aucune', () => {
    expect(aucune(piece({ sensible: true }))).toEqual({ aucune: 'sensible' });
    expect(aucune(piece({ sensible: true, comptee: false }))).toEqual({ aucune: 'non_comptee' });
  });
  it('sous-le-seuil-aucune', () => {
    expect(aucune(piece({ classementAutomatiquePermis: false }))).toEqual({ aucune: 'sous_le_seuil' });
    expect(aucune(piece({ classementAutomatiquePermis: false, sensible: true }))).toEqual({ aucune: 'sensible' });
  });
  it('desequilibre-aucune', () => {
    expect(aucune(piece({ ttc: c(119001) }))).toEqual({ aucune: 'desequilibre' });
    expect(aucune(piece({ ttc: c(0), parTaux: [taux(0, 0, 0)] }))).toEqual({ aucune: 'desequilibre' });
    expect(aucune(piece({ parTaux: [taux(1.5, 100000, 19000)] }))).toEqual({ aucune: 'desequilibre' });
    expect(aucune(piece({ parTaux: [taux(1900, Number.MAX_SAFE_INTEGER, 19000), taux(1900, 5, 0)] }))).toEqual({ aucune: 'desequilibre' });
  });
  it('meme-piece-meme-cle', () => {
    const cle = (p: PiecePourProposition) => (proposerEcriture(p, COMPTES) as { cleIdempotence: string }).cleIdempotence;
    expect(cle(piece())).toBe(cle(piece({ id: 'p-2', date: '2026-02-01' })));
    expect(cle(piece())).not.toBe(cle(piece({ sha256: 'empreinte-2' })));
    expect(cle(piece())).not.toBe(cle(piece({ type: 'recu' })));
    expect(proposerEcriture(piece(), COMPTES)).toEqual(proposerEcriture(piece(), COMPTES));
  });
});
