import { describe, expect, it } from 'vitest';
import { type Centimes, centimes } from '../../../argent/index.js';
import { cheminVirtuel, montantPourNom, nomNormalise, nomOrigineIncoherent, segment } from '../nom.js';

const c = (n: number): Centimes => centimes(n);
const BASE = { datePiece: '2026-10-14', fournisseur: 'Fournisseur Exemple', numero: 'F-0101', ttc: c(120000), devise: 'EUR' };
const erreur = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

describe('nom', () => {
  it('nom-exemple-de-la-spec', () => {
    expect(nomNormalise(BASE, 180)).toBe('2026-10-14_FOURNISSEUR-EXEMPLE_F-0101_1200.00(EUR)');
  });
  it('accents-et-espaces', () => {
    expect(segment('  Société  Générale   Été ')).toBe('SOCIETE-GENERALE-ETE');
    expect(segment('Ça\tva\nbien')).toBe('CA-VA-BIEN');
    expect(segment('a_b.c(d)-e')).toBe('A_B.C(D)-E');
  });
  it('caracteres-interdits-retires', () => {
    expect(segment('A/B\\C:D*E')).toBe('ABCDE');
    expect(segment('Café 😀 Bar')).toBe('CAFE-BAR');
    expect(segment('A - / - B')).toBe('A-B');
    expect(nomNormalise({ ...BASE, fournisseur: 'X/Y:Z*' }, 180)).toBe('2026-10-14_XYZ_F-0101_1200.00(EUR)');
  });
  it('champs-absents', () => {
    expect(nomNormalise({}, 180)).toBe('SANS-DATE_SANS-FOURNISSEUR_SANS-NUMERO_SANS-MONTANT(XXX)');
    expect(nomNormalise({ fournisseur: '😀', numero: '', devise: ' ' }, 180)).toBe('SANS-DATE_SANS-FOURNISSEUR_SANS-NUMERO_SANS-MONTANT(XXX)');
    expect(nomNormalise({ ttc: c(0) }, 180)).toContain('_0.00(XXX)');
  });
  it('longueur-max-coupe-le-fournisseur', () => {
    const long = { ...BASE, fournisseur: 'A'.repeat(100) };
    const nom = nomNormalise(long, 60);
    expect(nom).toHaveLength(60);
    expect(nom.startsWith('2026-10-14_AAAA')).toBe(true);
    expect(nom.endsWith('_F-0101_1200.00(EUR)')).toBe(true);
    expect(nomNormalise({ ...BASE, fournisseur: 'AAAAAAAA-BBBB' }, 40)).toBe('2026-10-14_AAAAAAAA_F-0101_1200.00(EUR)');
    expect(nomNormalise(BASE, 180)).toHaveLength(50);
    expect(nomNormalise(BASE, 50)).toBe(nomNormalise(BASE, 180));
    expect(nomNormalise(BASE, 49)).not.toBe(nomNormalise(BASE, 180));
    expect(nomNormalise({ ...BASE, fournisseur: 'ABCDEFGHIJKLMNOP' }, 40)).toBe('2026-10-14_ABCDEFGHI_F-0101_1200.00(EUR)');
    for (const [numero, max] of [['N'.repeat(60), 40], ['N'.repeat(170), 180], ['N'.repeat(300), 180], ['N'.repeat(200), 40]] as [string, number][]) {
      const nom = nomNormalise({ ...BASE, numero }, max);
      expect(nom.length).toBeLessThanOrEqual(max);
      expect(nom).toMatch(/^2026-10-14_[A-Z]+_N+_1200\.00\(EUR\)$/);
    }
    for (const m of [39, 39.5, Number.NaN, Number.POSITIVE_INFINITY, -1]) expect(erreur(() => nomNormalise(BASE, m))).toBe('reglage_invalide');
    expect(erreur(() => nomNormalise(BASE, 40))).toBeUndefined();
  });
  it('montants-negatif-et-petit', () => {
    const cas: [number, string][] = [[0, '0.00'], [5, '0.05'], [99, '0.99'], [100, '1.00'], [120000, '1200.00'], [-12000, '-120.00'], [-5, '-0.05'], [123456789, '1234567.89']];
    for (const [v, attendu] of cas) expect(montantPourNom(c(v))).toBe(attendu);
  });
  it('chemin-virtuel', () => {
    expect(cheminVirtuel(BASE)).toBe('2026/10/FOURNISSEUR-EXEMPLE');
    expect(cheminVirtuel({ fournisseur: 'Acme Démo' })).toBe('sans-date/ACME-DEMO');
    expect(cheminVirtuel({ datePiece: 'hier' })).toBe('sans-date/SANS-FOURNISSEUR');
    expect(cheminVirtuel({ datePiece: '2026-10-14x', fournisseur: 'A' })).toBe('sans-date/A');
    expect(cheminVirtuel({ datePiece: 'x2026-10-14', fournisseur: 'A' })).toBe('sans-date/A');
    expect(cheminVirtuel({})).toBe('sans-date/SANS-FOURNISSEUR');
  });
  it('nom-origine-incoherent', () => {
    const ref = { datePiece: '2026-10-14', ttc: c(120000) };
    const cas: [string, boolean][] = [
      ['facture_2026-10-14_1200.00.pdf', false], ['facture_20261014_1200,00.pdf', false], ['facture_14-10-2026.pdf', false],
      ['facture_2026-10-15.pdf', true], ['facture_20261015.pdf', true], ['facture_15-10-2026.pdf', true],
      ['facture_1300.00.pdf', true], ['facture_1200,01.pdf', true], ['facture_1200.00_2026-10-14_1300,00.pdf', true],
      ['scan_0042.pdf', false], ['IMG_12345678.jpg', false], ['facture_14.10.2026.pdf', false], ['v1.5.pdf', false], ['facture_20261314.pdf', false],
    ];
    for (const [nom, attendu] of cas) expect([nom, nomOrigineIncoherent(nom, ref)]).toEqual([nom, attendu]);
    expect(nomOrigineIncoherent('f_2026-10-15_9.99.pdf', {})).toBe(false);
    expect(nomOrigineIncoherent('f_1200.00.pdf', { ttc: c(-120000) })).toBe(false);
    expect(nomOrigineIncoherent('f_2026-10-15.pdf', { ttc: c(1) })).toBe(false);
    expect(nomOrigineIncoherent('f_9.99.pdf', { datePiece: '2026-10-14' })).toBe(false);
  });
});
