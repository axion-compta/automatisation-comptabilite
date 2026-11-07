import { describe, expect, it } from 'vitest';
import { dateVersIso, importer, lignesVersPieces, montantVersCentimes } from '../import-pieces.js';

const VIRG = { separateurDecimal: ',' } as const;
const POINT = { separateurDecimal: '.' } as const;
const NBSP = String.fromCharCode(160);
const NNBSP = String.fromCharCode(8239);
const opt = { sirenSociete: '123456782', separateurDecimal: ',', formatDate: 'JJ/MM/AAAA' } as const;
const ligne = (o: Record<string, string> = {}): Record<string, string> => ({
  numero: 'F-1', date: '10/02/2026', client: 'Client Fictif', ht: '100,00', tva: '19,00', ttc: '119,00', ...o,
});

describe('import des pièces de vente', () => {
  it('montant-francais', () => {
    expect(montantVersCentimes('1 234,56', VIRG)).toBe(123456);
    expect(montantVersCentimes(`1${NBSP}234${NNBSP}567,8`, VIRG)).toBe(123456780);
    expect(montantVersCentimes('0,05', VIRG)).toBe(5);
    expect(montantVersCentimes('7', VIRG)).toBe(700);
    expect(montantVersCentimes('0', VIRG)).toBe(0);
  });

  it('montant-point', () => {
    expect(montantVersCentimes('1234.5', POINT)).toBe(123450);
    expect(montantVersCentimes('1234,5', POINT)).toBeNull();
    expect(montantVersCentimes('1.234,56', VIRG)).toBeNull();
    expect(montantVersCentimes('0.99', POINT)).toBe(99);
  });

  it('montant-negatif', () => {
    expect(montantVersCentimes('-12,30', VIRG)).toBe(-1230);
    expect(montantVersCentimes('-0,00', VIRG)).toBe(0);
    expect(Object.is(montantVersCentimes('-0', VIRG), 0)).toBe(true);
    expect(montantVersCentimes('--1', VIRG)).toBeNull();
    expect(montantVersCentimes('1-', VIRG)).toBeNull();
    expect(montantVersCentimes('-', VIRG)).toBeNull();
  });

  it('montant-invalide', () => {
    for (const t of ['12,345', '1,2,3', 'abc', '', ' ', 'NaN', 'Infinity', '1e3', '12,', ',5', '1,2e', '12,5 0', '12,50 ', '+5', '9'.repeat(20)]) {
      expect(montantVersCentimes(t, VIRG)).toBeNull();
    }
    expect(montantVersCentimes(undefined as unknown as string, VIRG)).toBeNull();
    expect(montantVersCentimes(5 as unknown as string, VIRG)).toBeNull();
  });

  it('date-deux-formats', () => {
    expect(dateVersIso('10/02/2026', 'JJ/MM/AAAA')).toBe('2026-02-10');
    expect(dateVersIso('2026-02-10', 'AAAA-MM-JJ')).toBe('2026-02-10');
    expect(dateVersIso('31/02/2026', 'JJ/MM/AAAA')).toBeNull();
    expect(dateVersIso('2026-02-31', 'AAAA-MM-JJ')).toBeNull();
    expect(dateVersIso('2026-02-10', 'JJ/MM/AAAA')).toBeNull();
    expect(dateVersIso('10/02/2026', 'AAAA-MM-JJ')).toBeNull();
    expect(dateVersIso('1/2/2026', 'JJ/MM/AAAA')).toBeNull();
    expect(dateVersIso('', 'JJ/MM/AAAA')).toBeNull();
    expect(dateVersIso(undefined as unknown as string, 'AAAA-MM-JJ')).toBeNull();
  });

  it('piece-complete', () => {
    const r = lignesVersPieces([ligne()], opt);
    expect(r.rejets).toEqual([]);
    expect(r.pieces).toHaveLength(1);
    expect(r.pieces[0]).toMatchObject({
      numero: 'F-1', dateFacture: '2026-02-10', htCentimes: 10000, tvaCentimes: 1900, ttcCentimes: 11900,
      origine: 'import_fichier', statut: 'lue', type: 'facture', ligneSource: 1, cle: '123456782|F-1|2026-02-10|11900',
    });
    expect(lignesVersPieces([], opt)).toEqual({ pieces: [], rejets: [] });
  });

  it('numero-absent-rejete', () => {
    const r = lignesVersPieces([ligne({ numero: '  ' }), ligne({ numero: '' }), { date: '10/02/2026' }], opt);
    expect(r.pieces).toEqual([]);
    expect(r.rejets).toEqual([
      { ligne: 1, raison: 'numero_absent' },
      { ligne: 2, raison: 'numero_absent' },
      { ligne: 3, raison: 'numero_absent' },
    ]);
  });

  it('date-et-montant-rejetes', () => {
    const r = lignesVersPieces([ligne({ date: '31/02/2026' }), ligne({ ht: 'abc' }), ligne({ tva: '' }), ligne({ ttc: '1,234' })], opt);
    expect(r.rejets.map((x) => x.raison)).toEqual(['date_invalide', 'montant_invalide', 'montant_invalide', 'montant_invalide']);
    expect(r.rejets.map((x) => x.ligne)).toEqual([1, 2, 3, 4]);
  });

  it('totaux-incoherents-rejetes', () => {
    const r = lignesVersPieces([ligne({ ttc: '119,01' }), ligne({ numero: 'F-2' })], opt);
    expect(r.rejets).toEqual([{ ligne: 1, raison: 'totaux_incoherents' }]);
    expect(r.pieces.map((p) => p.numero)).toEqual(['F-2']);
    const avoir = lignesVersPieces([ligne({ ht: '-100,00', tva: '-19,00', ttc: '-119,00' })], opt);
    expect(avoir.pieces[0]?.ttcCentimes).toBe(-11900);
  });

  it('v22-cinq-mille-dont-dix-sans-numero', () => {
    const objets = Array.from({ length: 5000 }, (_, i) => ligne({ numero: i % 500 === 0 ? '' : `F-${String(i)}` }));
    const r = importer(new Set(), objets, opt);
    expect(r.creees).toHaveLength(4990);
    expect(r.rejets).toHaveLength(10);
    expect(r.rejets.every((x) => x.raison === 'numero_absent')).toBe(true);
    expect(r.rejets[0]?.ligne).toBe(1);
    expect(r.dejaPresentes).toBe(0);
  });

  it('v22-reimport-zero-cree', () => {
    const objets = [ligne(), ligne({ numero: 'F-2' })];
    const premier = importer(new Set(), objets, opt);
    const cles = new Set(premier.creees.map((p) => p.cle as string));
    const second = importer(cles, objets, opt);
    expect(second.creees).toEqual([]);
    expect(second.dejaPresentes).toBe(2);
  });

  it('id-uniques-meme-numero-dates-differentes', () => {
    const r = lignesVersPieces([ligne(), ligne({ date: '10/02/2027' }), ligne({ numero: ' ' })], opt);
    expect(new Set(r.pieces.map((p) => p.id)).size).toBe(2);
  });

  it('doublon-dans-le-meme-fichier-une-seule-piece', () => {
    const r = importer(new Set(), [ligne(), ligne(), ligne({ numero: 'F-2' })], opt);
    expect(r.creees.map((p) => p.numero)).toEqual(['F-1', 'F-2']);
    expect(r.dejaPresentes).toBe(1);
  });
});
