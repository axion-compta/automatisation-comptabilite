import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { decoderFec, ErreurVariante, normaliserMontantSens, totauxDuFichier, verifierTotaux, type LigneBrute } from '../variantes.js';

// Fichiers, libellés et montants INVENTÉS pour les tests.
const ligne = (over: LigneBrute): LigneBrute => ({ EcritureNum: '1', CompteNum: '607000', ...over });
const iso = (...o: number[]) => Uint8Array.from(o);
const lignesMS = [
  ligne({ Montant: '1200,50', Sens: 'D' }),
  ligne({ Montant: '1200,50', Sens: 'C' }),
  ligne({ Montant: '0,07', Sens: 'd' }),
  ligne({ Montant: '0,07', Sens: ' c ' }),
];

describe('variantes de FEC', () => {
  it('iso-8859-15-decode', () => {
    // « 12 € » (A4), « é » (E9), « Œ » (BC), « š » (A8), « ÿ » (FF)
    expect(decoderFec(iso(0x31, 0x32, 0x20, 0xa4, 0x20, 0xe9, 0xbc, 0xa8, 0xff))).toBe('12 € éŒšÿ');
    expect(decoderFec(iso(0xe9))).toBe('é');
    expect(decoderFec(new Uint8Array(0))).toBe('');
    expect(decoderFec(iso(0xa4, 0xa6, 0xb4, 0xb8, 0xbd, 0xbe))).toBe('€ŠŽžœŸ');
  });

  it('utf8-inchange', () => {
    const e = new TextEncoder();
    expect(decoderFec(e.encode('Achat é € Œ'))).toBe('Achat é € Œ');
    expect(decoderFec(iso(0xef, 0xbb, 0xbf, ...e.encode('JournalCode')))).toBe('JournalCode');
    expect(decoderFec(iso(0xe2, 0x82, 0xac))).toBe('€');
  });

  it('montant-sens-vers-debit-credit', () => {
    const r = normaliserMontantSens(lignesMS);
    expect(r.map((l) => [l.Debit, l.Credit])).toEqual([
      ['1200,50', '0,00'], ['0,00', '1200,50'], ['0,07', '0,00'], ['0,00', '0,07'],
    ]);
    expect(r[0]).not.toHaveProperty('Montant');
    expect(r[0]).not.toHaveProperty('Sens');
    expect(r[0]?.CompteNum).toBe('607000');
    // lignes déjà en Debit/Credit : inchangées
    const dc = ligne({ Debit: '5,00', Credit: '0,00' });
    expect(normaliserMontantSens([dc])).toEqual([dc]);
    expect(lignesMS[0]).toHaveProperty('Montant');
  });

  it('sens-inconnu-refuse', () => {
    for (const sens of ['X', '', 'DC', 'Debit', undefined]) {
      const l = ligne({ Montant: '1,00', ...(sens === undefined ? {} : { Sens: sens }) });
      expect(() => normaliserMontantSens([lignesMS[0]!, l])).toThrow(ErreurVariante);
    }
    expect(() => normaliserMontantSens([ligne({ Montant: '1,00', Sens: 'X' })])).toThrow(/sens_inconnu/);
    expect(() => normaliserMontantSens([ligne({ Montant: '-1,00', Sens: 'D' })])).toThrow(/montant_invalide/);
    expect(() => normaliserMontantSens([ligne({ Montant: '1.5', Sens: 'D' })])).toThrow(/montant_invalide/);
  });

  it('totaux-importes-egaux-au-fichier', () => {
    const lu = totauxDuFichier(normaliserMontantSens(lignesMS));
    expect(lu).toEqual({ debit: centimes(120057), credit: centimes(120057), lignes: 4 });
    expect(verifierTotaux(lu, { debit: centimes(120057), credit: centimes(120057) })).toEqual({
      ok: true, ecartDebit: centimes(0), ecartCredit: centimes(0),
    });
    expect(totauxDuFichier([ligne({ Debit: '', Credit: '2,50' })])).toMatchObject({ debit: 0, credit: 250 });
    expect(totauxDuFichier([])).toEqual({ debit: 0, credit: 0, lignes: 0 });
    expect(() => totauxDuFichier([ligne({ Debit: 'abc', Credit: '0,00' })])).toThrow(/montant_invalide/);
  });

  it('ecart-de-totaux-refuse', () => {
    const lu = { debit: centimes(120057), credit: centimes(120057) };
    expect(verifierTotaux(lu, { debit: centimes(120058), credit: centimes(120057) })).toEqual({
      ok: false, ecartDebit: centimes(1), ecartCredit: centimes(0),
    });
    expect(verifierTotaux(lu, { debit: centimes(120057), credit: centimes(120056) })).toEqual({
      ok: false, ecartDebit: centimes(0), ecartCredit: centimes(-1),
    });
    expect(verifierTotaux(lu, { debit: centimes(0), credit: centimes(0) }).ok).toBe(false);
  });
});
