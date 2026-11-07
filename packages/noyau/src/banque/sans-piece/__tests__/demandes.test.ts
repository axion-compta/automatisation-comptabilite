import { describe, expect, it } from 'vitest';
import { ErreurArgent, type Centimes } from '../../../argent/index.js';
import { cartesAccueil, ErreurDemandes, regrouper, type LigneSansPiece } from '../demandes.js';

const c = (n: number) => n as Centimes;
let n = 0;
const l = (montant: number, extra: Partial<LigneSansPiece> = {}): LigneSansPiece => ({
  id: 'l' + String(++n).padStart(3, '0'), montant: c(montant), contrepartieId: 'cp-a', libelleNormalise: 'libelle', type: 'piece_attendue', etat: 'SANS_PIECE', ...extra,
});
const douze = (): LigneSansPiece[] => {
  const parts: Array<[string, number[]]> = [['cp-a', [-6200, -6200, -6200]], ['cp-b', [-1500, -2500]], ['cp-c', [-999, -1]], ['cp-d', [-70001, -2]], ['cp-e', [-300, -4400, -12]]];
  return parts.flatMap(([cp, ms]) => ms.map((m) => l(m, { contrepartieId: cp })));
};
const err = (fn: () => unknown): unknown => { try { fn(); } catch (e) { return e; } return null; };

describe('sans pièce : un fait = une demande', () => {
  it('t07-1-cinq-demandes', () => {
    const lignes = douze();
    expect(lignes).toHaveLength(12);
    const d = regrouper(lignes);
    expect(d).toHaveLength(5);
    expect(d.map((x) => x.nombre).sort()).toEqual([2, 2, 2, 3, 3]);
    expect(d.every((x) => x.codeQuestion === 'factures_manquantes')).toBe(true);
    expect(d[0]?.reponsesPretes).toEqual(['je_les_depose', 'ou_les_trouver', 'pas_de_facture', 'c_est_personnel']);
  });

  it('t07-1-impact-total-au-centime', () => {
    const lignes = douze();
    const attendu = lignes.reduce((s, x) => s + Math.abs(x.montant), 0);
    expect(regrouper(lignes).reduce((s, x) => s + x.impact, 0)).toBe(attendu);
    expect(regrouper([l(-1, { contrepartieId: 'x' }), l(1, { contrepartieId: 'x' })])[0]?.impact).toBe(2);
  });

  it('t07-2-trois-prelevements-une-demande', () => {
    const d = regrouper([l(-6200), l(-6200), l(-6200)]);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ impact: 18600, nombre: 3, cle: 'c:cp-a|piece_attendue' });
  });

  it('sans-contrepartie-par-libelle', () => {
    const sans = (lib: string, t = 'piece_attendue') => l(-100, { contrepartieId: undefined, libelleNormalise: lib, type: t });
    const d = regrouper([sans('abo'), sans('abo'), sans('autre'), sans('abo', 'acompte'), l(-100, { contrepartieId: '', libelleNormalise: 'abo' })]);
    expect(d.map((x) => [x.cle, x.nombre]).sort()).toEqual([['l:abo|acompte', 1], ['l:abo|piece_attendue', 3], ['l:autre|piece_attendue', 1]]);
    expect(regrouper([l(-1), l(-1, { type: 'acompte' })])).toHaveLength(2);
  });

  it('tri-par-impact-puis-cle', () => {
    const lignes = [l(-100, { contrepartieId: 'b' }), l(-100, { contrepartieId: 'a' }), l(-500, { contrepartieId: 'z' }), l(300, { contrepartieId: 'y' })];
    const ordre = (ls: LigneSansPiece[]) => regrouper(ls).map((x) => x.cle);
    expect(ordre(lignes)).toEqual(['c:z|piece_attendue', 'c:y|piece_attendue', 'c:a|piece_attendue', 'c:b|piece_attendue']);
    expect(ordre([...lignes].reverse())).toEqual(ordre(lignes));
    expect(regrouper([l(-5, { id: 'zz' }), l(-5, { id: 'aa' })])[0]?.ligneIds).toEqual(['aa', 'zz']);
  });

  it('cartes-accueil-bornees', () => {
    const d = regrouper(['a', 'b', 'c', 'd', 'e'].map((cp, i) => l(-(i + 1) * 100, { contrepartieId: cp })));
    expect(cartesAccueil(d, 3).map((x) => x.cle)).toEqual(d.slice(0, 3).map((x) => x.cle));
    expect(cartesAccueil(d, 99)).toEqual(d);
    expect(cartesAccueil(d, 0)).toEqual([]);
    expect(cartesAccueil([], 3)).toEqual([]);
    for (const m of [Number.NaN, -1, 1.5, Infinity]) expect(err(() => cartesAccueil(d, m)), String(m)).toBeInstanceOf(ErreurDemandes);
  });

  it('lignes-rapprochees-ignorees', () => {
    expect(regrouper([])).toEqual([]);
    const d = regrouper([l(-100, { etat: 'RAPPROCHEE' }), l(-100, { etat: 'SANS_PIECE_REQUISE' }), l(-200, { etat: 'A_QUALIFIER', type: 'credit_inconnu' }), l(-300)]);
    expect(d.map((x) => x.codeQuestion).sort()).toEqual(['a_qualifier', 'factures_manquantes']);
    expect(regrouper([l(Number.NaN, { etat: 'RAPPROCHEE' })])).toEqual([]);
  });

  it('montants-invalides-et-debordement', () => {
    for (const m of [Number.NaN, Infinity, 1.5]) expect(err(() => regrouper([l(m)])), String(m)).toBeInstanceOf(ErreurDemandes);
    const gros = Number.MAX_SAFE_INTEGER;
    expect(err(() => regrouper([l(gros), l(gros)]))).toBeInstanceOf(ErreurArgent);
    expect(regrouper([l(gros)])[0]?.impact).toBe(gros);
  });
});
