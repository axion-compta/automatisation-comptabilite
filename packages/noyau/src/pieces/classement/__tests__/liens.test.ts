import { describe, expect, it } from 'vitest';
import { centimes as c } from '../../../argent/index.js';
import { ErreurPiece, type TypePiece } from '../../types.js';
import { evaluerLien, evaluerPartieDe, type PieceLiee } from '../liens.js';

const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurPiece ? e.code : 'autre'; }
  return undefined;
};
const p = (id: string, type: TypePiece, ttc: number, o: Partial<PieceLiee> = {}): PieceLiee => ({ id, type, fournisseurId: 'four-1', numerosCites: [], ttc: c(ttc), ...o });
const facture = p('f1', 'facture', 12000, { numero: 'F-0099', date: '2026-03-10' });
const recu = p('r1', 'recu', 12000, { datePaiement: '2026-03-10' });

describe('liens entre pièces', () => {
  it('paiement-confirme', () => {
    expect(evaluerLien('paiement_de', recu, facture)).toMatchObject({ sorte: 'paiement_de', decision: 'confirme' });
    expect(evaluerLien('paiement_de', { ...recu, type: 'ticket', datePaiement: '2026-04-01' }, facture).decision).toBe('confirme');
    expect(evaluerLien('paiement_de', { ...recu, ttc: c(12001) }, facture).decision).toBe('rejete');
    expect(evaluerLien('paiement_de', { ...recu, fournisseurId: 'four-2' }, facture).decision).toBe('rejete');
    expect(evaluerLien('paiement_de', { ...recu, fournisseurId: undefined }, { ...facture, fournisseurId: undefined }).decision).toBe('rejete');
    expect(evaluerLien('paiement_de', { ...recu, type: 'avoir' }, facture).decision).toBe('rejete');
    expect(evaluerLien('paiement_de', recu, { ...facture, type: 'recu' }).decision).toBe('rejete');
  });
  it('paiement-avant-facture-rejete', () => {
    expect(evaluerLien('paiement_de', { ...recu, datePaiement: '2026-03-09' }, facture).decision).toBe('rejete');
    for (const d of [undefined, '', '2026-02-30', '10/03/2026', '2026-3-10', 'abc']) {
      expect(evaluerLien('paiement_de', { ...recu, datePaiement: d }, facture).decision).toBe('rejete');
      expect(evaluerLien('paiement_de', recu, { ...facture, date: d }).decision).toBe('rejete');
    }
  });
  it('avoir-numero-cite-confirme', () => {
    const avoir = p('a1', 'avoir', -12000, { numerosCites: ['f 0099'] });
    expect(evaluerLien('avoir_de', avoir, facture)).toMatchObject({ decision: 'confirme' });
    expect(evaluerLien('avoir_de', { ...avoir, numerosCites: ['f/0099.'] }, facture).decision).toBe('confirme');
    expect(evaluerLien('avoir_de', { ...avoir, numerosCites: ['F-0098'] }, { ...facture, numero: undefined }).decision).toBe('propose');
    expect(evaluerLien('avoir_de', { ...avoir, fournisseurId: 'four-2', numerosCites: ['F-0099'] }, facture).decision).toBe('confirme');
  });
  it('avoir-sans-numero-propose', () => {
    expect(evaluerLien('avoir_de', p('a1', 'avoir', -12000), facture).decision).toBe('propose');
    expect(evaluerLien('avoir_de', p('a1', 'avoir', -5000), facture).decision).toBe('propose');
    expect(evaluerLien('avoir_de', p('a1', 'avoir', -5000, { fournisseurId: 'four-2' }), facture).decision).toBe('rejete');
    expect(evaluerLien('avoir_de', p('a1', 'facture', -5000), facture).decision).toBe('rejete');
  });
  it('avoir-plus-grand-rejete', () => {
    expect(evaluerLien('avoir_de', p('a1', 'avoir', -12001), facture).decision).toBe('rejete');
  });
  it('reemise-proposee', () => {
    const annulee = p('x1', 'annulee', 12000);
    expect(evaluerLien('reemise_de', p('n1', 'reemise', 12000), annulee).decision).toBe('propose');
    expect(evaluerLien('reemise_de', p('n1', 'reemise', 12000, { fournisseurId: 'four-2' }), annulee).decision).toBe('rejete');
    expect(evaluerLien('reemise_de', p('n1', 'facture', 12000), annulee).decision).toBe('rejete');
    expect(evaluerLien('reemise_de', p('n1', 'reemise', 12000), p('x1', 'facture', 12000)).decision).toBe('rejete');
  });
  it('acompte-confirme-ou-propose', () => {
    const acompte = p('c1', 'facture_acompte', 3000, { numero: 'AC-7' });
    expect(evaluerLien('acompte_de', p('f2', 'facture', 12000, { numerosCites: ['AC7'] }), acompte).decision).toBe('confirme');
    expect(evaluerLien('acompte_de', p('f2', 'facture', 12000), acompte).decision).toBe('propose');
    expect(evaluerLien('acompte_de', p('f2', 'facture', 12000, { fournisseurId: 'four-2' }), acompte).decision).toBe('rejete');
    expect(evaluerLien('acompte_de', p('f2', 'avoir', 12000), acompte).decision).toBe('rejete');
    expect(evaluerLien('doublon_de', facture, p('f9', 'facture', 12000)).decision).toBe('rejete');
    expect(evaluerLien('partie_de', facture, p('f9', 'facture', 12000)).decision).toBe('rejete');
  });
  it('partie-de-somme-exacte', () => {
    const globale = p('g', 'facture', 10000);
    const parties = [p('p1', 'facture', 4000), p('p2', 'facture', 3500), p('p3', 'facture', 2500)];
    const r = evaluerPartieDe(globale, parties);
    expect(r).toMatchObject({ sorte: 'partie_de', decision: 'confirme' });
    expect(evaluerPartieDe(globale, [...parties].reverse())).toEqual(r);
    expect(evaluerPartieDe(globale, [parties[1]!, parties[2]!, parties[0]!])).toEqual(r);
  });
  it('partie-de-un-centime-rejete', () => {
    const globale = p('g', 'facture', 10000);
    expect(evaluerPartieDe(globale, [p('p1', 'facture', 5000), p('p2', 'facture', 5001)]).decision).toBe('rejete');
    expect(evaluerPartieDe(globale, [p('p1', 'facture', 5000), p('p2', 'facture', 4999)]).decision).toBe('rejete');
    expect(evaluerPartieDe(globale, []).decision).toBe('rejete');
    expect(evaluerPartieDe(p('g', 'facture', 0), []).decision).toBe('rejete');
    expect(evaluerPartieDe(globale, [p('g', 'facture', 10000)]).decision).toBe('rejete');
  });
  it('meme-piece-rejetee', () => {
    expect(evaluerLien('paiement_de', { ...recu, id: 'f1' }, facture).decision).toBe('rejete');
    expect(evaluerLien('avoir_de', p('f1', 'avoir', -100), facture).decision).toBe('rejete');
    expect(evaluerPartieDe(p('g', 'facture', 100), [p('p1', 'facture', 50), p('p1', 'facture', 50)]).decision).toBe('rejete');
  });
  it('regles-nommees', () => {
    const avoir = p('a1', 'avoir', -12000);
    const acompte = p('c1', 'facture_acompte', 3000, { numero: 'AC-7' });
    const cas: [Parameters<typeof evaluerLien>, string][] = [
      [['paiement_de', recu, facture], 'meme_fournisseur_meme_ttc_paiement_apres_facture'],
      [['paiement_de', { ...recu, datePaiement: '2026-03-09' }, facture], 'paiement_avant_facture'],
      [['paiement_de', { ...recu, ttc: c(1) }, facture], 'fournisseur_ou_montant_different'],
      [['paiement_de', { ...recu, datePaiement: '2026-03-10x' }, facture], 'date_invalide'],
      [['paiement_de', { ...recu, datePaiement: 'x2026-03-10' }, facture], 'date_invalide'],
      [['paiement_de', { ...recu, type: 'avoir' }, facture], 'types_incompatibles'],
      [['paiement_de', { ...recu, id: 'f1' }, facture], 'meme_piece'],
      [['avoir_de', { ...avoir, numerosCites: ['F-0099'] }, facture], 'numero_cite'],
      [['avoir_de', avoir, facture], 'meme_fournisseur_montant_inferieur'],
      [['avoir_de', { ...avoir, numerosCites: [''] }, { ...facture, numero: ' - ', fournisseurId: 'z' }], 'aucune_regle'],
      [['reemise_de', p('n1', 'reemise', 1), p('x1', 'annulee', 1)], 'meme_fournisseur'],
      [['reemise_de', p('n1', 'reemise', 1, { fournisseurId: 'z' }), p('x1', 'annulee', 1)], 'fournisseur_different'],
      [['acompte_de', p('f2', 'facture', 1, { numerosCites: ['ac 7'] }), acompte], 'numero_cite'],
      [['acompte_de', p('f2', 'facture', 1), acompte], 'meme_fournisseur'],
      [['acompte_de', p('f2', 'facture', 1, { fournisseurId: 'z' }), acompte], 'aucune_regle'],
      [['doublon_de', facture, p('f9', 'facture', 1)], 'regle_hors_fiche'],
    ];
    for (const [args, regle] of cas) expect(evaluerLien(...args).regle).toBe(regle);
    expect(evaluerPartieDe(p('g', 'facture', 1), []).regle).toBe('aucune_partie');
    expect(evaluerPartieDe(p('g', 'facture', 1), [p('g', 'facture', 1)]).regle).toBe('meme_piece');
    expect(evaluerPartieDe(p('g', 'facture', 2), [p('p', 'facture', 1)]).regle).toBe('somme_differente');
    expect(evaluerPartieDe(p('g', 'facture', 1), [p('p', 'facture', 1)]).regle).toBe('somme_exacte');
  });
  it('entrees-invalides-refusees', () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, 0.5]) {
      expect(code(() => evaluerLien('paiement_de', { ...recu, ttc: v as never }, facture))).toBe('montant_invalide');
      expect(code(() => evaluerPartieDe(p('g', 'facture', 1), [{ ...facture, ttc: v as never }]))).toBe('montant_invalide');
    }
    expect(code(() => evaluerLien('inconnue' as never, recu, facture))).toBe('sorte_invalide');
  });
});
