import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { ErreurPiece } from '../../types.js';
import { comparerPieces, numeroNormalise, pieceDeReference, type PieceComparee, texteNormalise } from '../doublons.js';

const p = (o: Partial<PieceComparee> = {}): PieceComparee => ({ id: 'a', sha256: 'h1', electronique: false, qualite: 'texte_pdf', recueLe: '2026-03-01T10:00:00Z', ...o });
const opt = { distanceImageMax: 6 };
const aucun = { niveau: null, decision: 'aucun' };

describe('numeroNormalise', () => {
  it.each([
    ['f-2026/001.a b', undefined, 'F2026001A B'.replace(' ', '')],
    ['FAC-0042', 'fac', '42'],
    ['FAC-0042', 'xyz', 'FAC42'],
    ['A-0007', 'A', '7'],
    ['0000', undefined, '0'],
    ['F007', undefined, 'F7'],
    ['F100', undefined, 'F100'],
    ['', undefined, ''],
    ['FAC', 'FAC', ''],
  ])('%s / %s', (n, pre, attendu) => {
    expect(numeroNormalise(n, pre)).toBe(attendu);
  });
  it('texteNormalise', () => {
    expect(texteNormalise('  Café, Été !\n 12-3 ')).toBe('cafeete123');
  });
});

describe('comparerPieces', () => {
  it('meme-empreinte-fichier-identique', () => {
    expect(comparerPieces(p({ id: 'b' }), p(), opt)).toEqual({ niveau: 1, decision: 'fichier_identique' });
    expect(comparerPieces(p({ numero: 'F1' }), p({ numero: 'F2' }), opt)).toEqual({ niveau: 1, decision: 'fichier_identique' });
    expect(comparerPieces(p({ sha256: '' }), p({ sha256: '' }), opt)).toEqual(aucun);
  });
  it('electronique-doublon-sur', () => {
    const e = { sha256: 'x', electronique: true, sirenEmetteur: '123456789', numero: 'F-9', date: '2026-03-01', ttc: centimes(1000) };
    expect(comparerPieces(p(e), p({ ...e, sha256: 'y', numero: 'f9' }), opt)).toEqual({ niveau: 2, decision: 'doublon_sur' });
    expect(comparerPieces(p(e), p({ ...e, sha256: 'y', electronique: false }), opt)).toEqual(aucun);
    expect(comparerPieces(p(e), p({ ...e, sha256: 'y', ttc: centimes(1001) }), opt)).toEqual(aucun);
    expect(comparerPieces(p(e), p({ ...e, sha256: 'y', date: '2026-03-02' }), opt)).toEqual(aucun);
    expect(comparerPieces(p(e), p({ ...e, sha256: 'y', sirenEmetteur: '1' }), opt)).toEqual(aucun);
    expect(comparerPieces(p({ ...e, electronique: false }), p({ ...e, sha256: 'y' }), opt)).toEqual(aucun);
  });
  const cle = { sha256: 'x', fournisseurCle: 'fournisseur-a', compteFacturation: 'C1', prefixe: 'C1', numero: 'C1-0042', ttc: centimes(4999) };
  it('cle-metier-meme-ttc-sur', () => {
    expect(comparerPieces(p(cle), p({ ...cle, sha256: 'y', numero: '42', prefixe: undefined }), opt)).toEqual({ niveau: 3, decision: 'doublon_sur' });
    expect(comparerPieces(p(cle), p({ ...cle, sha256: 'y', fournisseurCle: 'b' }), opt)).toEqual(aucun);
    expect(comparerPieces(p(cle), p({ ...cle, sha256: 'y', compteFacturation: 'C2' }), opt)).toEqual(aucun);
    expect(comparerPieces(p({ ...cle, compteFacturation: undefined }), p({ ...cle, sha256: 'y', compteFacturation: undefined }), opt).decision).toBe('doublon_sur');
  });
  it('cle-metier-ttc-different-collision', () => {
    expect(comparerPieces(p(cle), p({ ...cle, sha256: 'y', ttc: centimes(5000) }), opt)).toEqual({ niveau: 3, decision: 'collision_numeros' });
    expect(comparerPieces(p({ ...cle, ttc: undefined }), p({ ...cle, sha256: 'y' }), opt)).toEqual(aucun);
  });
  it('numeros-differents-jamais-doublon', () => {
    const m = { sha256: 'x', fournisseurCle: 'f', date: '2026-03-01', ttc: centimes(4999), texteNormalise: 'meme texte', distanceImage: 0, sirenEmetteur: '1', electronique: true };
    expect(comparerPieces(p({ ...m, numero: 'F-0201' }), p({ ...m, sha256: 'y', numero: 'F-0202' }), opt)).toEqual(aucun);
    expect(comparerPieces(p({ ...m, numero: 'F-0201' }), p({ ...m, sha256: 'y', numero: 'f/201' }), opt).decision).toBe('doublon_sur');
    expect(comparerPieces(p({ ...m, numero: 'F-0201' }), p({ ...m, sha256: 'y' }), opt).decision).not.toBe('aucun');
  });
  it('texte-identique-propose', () => {
    const t = { sha256: 'x', texteNormalise: 'abc' };
    expect(comparerPieces(p(t), p({ ...t, sha256: 'y' }), opt)).toEqual({ niveau: 4, decision: 'doublon_propose' });
    expect(comparerPieces(p(t), p({ sha256: 'y', texteNormalise: 'abd' }), opt)).toEqual(aucun);
    expect(comparerPieces(p({ sha256: 'x', texteNormalise: '' }), p({ sha256: 'y', texteNormalise: '' }), opt)).toEqual(aucun);
  });
  it('image-proche-proposee', () => {
    const i = (d?: number): PieceComparee => p({ sha256: 'x', distanceImage: d });
    expect(comparerPieces(i(6), p({ sha256: 'y' }), opt)).toEqual({ niveau: 5, decision: 'doublon_propose' });
    expect(comparerPieces(i(0), p({ sha256: 'y' }), opt).niveau).toBe(5);
    expect(comparerPieces(i(7), p({ sha256: 'y' }), opt)).toEqual(aucun);
    expect(comparerPieces(i(-1), p({ sha256: 'y' }), opt)).toEqual(aucun);
    expect(comparerPieces(i(Number.NaN), p({ sha256: 'y' }), opt)).toEqual(aucun);
    expect(comparerPieces(i(undefined), p({ sha256: 'y' }), opt)).toEqual(aucun);
  });
  it('tickets-sans-heure-proposes', () => {
    const t = { sha256: 'x', fournisseurCle: 'f', date: '2026-03-01', ttc: centimes(850) };
    expect(comparerPieces(p({ ...t, heure: '12:30' }), p({ ...t, sha256: 'y', heure: '12:30' }), opt)).toEqual({ niveau: 3, decision: 'doublon_sur' });
    expect(comparerPieces(p(t), p({ ...t, sha256: 'y', heure: '12:30' }), opt)).toEqual({ niveau: 4, decision: 'doublon_propose' });
    expect(comparerPieces(p({ ...t, heure: '12:30' }), p({ ...t, sha256: 'y' }), opt).decision).toBe('doublon_propose');
    expect(comparerPieces(p({ ...t, heure: '12:30' }), p({ ...t, sha256: 'y', heure: '12:31' }), opt)).toEqual(aucun);
    expect(comparerPieces(p({ ...t, heure: '12:30' }), p({ ...t, sha256: 'y', ttc: centimes(851), heure: '12:30' }), opt)).toEqual(aucun);
    expect(comparerPieces(p({ ...t, heure: '12:30' }), p({ ...t, sha256: 'y', date: '2026-03-02', heure: '12:30' }), opt)).toEqual(aucun);
  });
  it('reference-xml-avant-photo', () => {
    const [x, t, f] = [p({ id: 'x', qualite: 'xml' }), p({ id: 't', qualite: 'texte_pdf' }), p({ id: 'f', qualite: 'photo' })];
    expect(pieceDeReference(f, x)).toBe('x');
    expect(pieceDeReference(x, f)).toBe('x');
    expect(pieceDeReference(f, t)).toBe('t');
    expect(pieceDeReference(t, x)).toBe('x');
    expect(pieceDeReference(p({ id: 'b', recueLe: '2026-01-01' }), p({ id: 'a', recueLe: '2026-02-01' }))).toBe('b');
    expect(pieceDeReference(p({ id: 'b', recueLe: '2026-02-01' }), p({ id: 'a', recueLe: '2026-01-01' }))).toBe('a');
    expect(pieceDeReference(p({ id: 'b' }), p({ id: 'a' }))).toBe('a');
    expect(pieceDeReference(p({ id: 'a' }), p({ id: 'b' }))).toBe('a');
  });
  it('champs-absents-aucun', () => {
    expect(comparerPieces(p({ sha256: 'x' }), p({ sha256: 'y' }), opt)).toEqual(aucun);
    expect(comparerPieces(p({ sha256: 'x', electronique: true }), p({ sha256: 'y', electronique: true }), opt)).toEqual(aucun);
    expect(comparerPieces(p({ sha256: 'x', numero: 'F1' }), p({ sha256: 'y', numero: 'F1' }), opt)).toEqual(aucun);
  });
  it('reglage-distance-invalide', () => {
    for (const max of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      expect(() => comparerPieces(p({ sha256: 'x' }), p({ sha256: 'y' }), { distanceImageMax: max })).toThrow(ErreurPiece);
    }
    expect(() => comparerPieces(p({ sha256: 'x' }), p({ sha256: 'y' }), { distanceImageMax: 1 })).not.toThrow();
  });
  it('heures-differentes-image-proposee', () => {
    const t = { sha256: 'x', fournisseurCle: 'f', date: '2026-03-01', ttc: centimes(850) };
    expect(comparerPieces(p({ ...t, heure: '12:30', distanceImage: 0 }), p({ ...t, sha256: 'y', heure: '12:31' }), opt)).toEqual({ niveau: 5, decision: 'doublon_propose' });
    expect(comparerPieces(p({ ...t, heure: '12:30', texteNormalise: 'abc' }), p({ ...t, sha256: 'y', heure: '12:31', texteNormalise: 'abc' }), opt)).toEqual({ niveau: 4, decision: 'doublon_propose' });
  });
  it('meme-numero-comptes-differents-pas-sur', () => {
    const t = { sha256: 'x', numero: 'F1', fournisseurCle: 'f', date: '2026-03-01', ttc: centimes(850), heure: '12:30' };
    expect(comparerPieces(p({ ...t, compteFacturation: 'c1' }), p({ ...t, sha256: 'y', compteFacturation: 'c2' }), opt)).toEqual(aucun);
  });
});
