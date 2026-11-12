import { describe, expect, it } from 'vitest';
import {
  ErreurChange,
  convertirAuCentime,
  dateDuTauxApplicable,
  regleChangeAuJour,
  type RegleChange,
} from '../taux.js';

const REGLE: RegleChange = { heurePublicationUtc: '15:00', arrondi: 'demi_loin_de_zero', jourSansCotation: 'veille_ouvree' };

// Table écrite à la main : [montant en centimes de devise, taux (8 décimales), attendu en centimes d'euro].
const BANC: [number, number, number][] = [
  [0, 110000000, 0],
  [1, 92500000, 1],
  [5, 250000000, 13],
  [-5, 50000000, -3],
  [99, 100000000, 99],
  [-99, 99999999, -99],
  [1000, 123456789, 1235],
  [-1001, 8765432, -88],
  [12345, 110000000, 13580],
  [-12345, 92500000, -11419],
  [100000, 250000000, 250000],
  [7, 50000000, 4],
  [3, 100000000, 3],
  [-3, 99999999, -3],
  [250, 123456789, 309],
  [-250, 8765432, -22],
  [999999, 110000000, 1099999],
  [15, 250000000, 38],
  [-15, 50000000, -8],
  [45, 100000000, 45],
  [-45, 99999999, -45],
  [0, 92500000, 0],
  [1, 250000000, 3],
  [5, 50000000, 3],
  [-5, 100000000, -5],
  [99, 99999999, 99],
  [-99, 123456789, -122],
  [1000, 8765432, 88],
  [-1001, 110000000, -1101],
  [12345, 92500000, 11419],
  [-12345, 250000000, -30863],
  [100000, 50000000, 50000],
  [7, 100000000, 7],
  [3, 99999999, 3],
  [-3, 123456789, -4],
  [250, 8765432, 22],
  [-250, 110000000, -275],
  [999999, 92500000, 924999],
  [15, 50000000, 8],
  [-15, 100000000, -15],
  [45, 99999999, 45],
  [-45, 123456789, -56],
  [0, 250000000, 0],
  [1, 50000000, 1],
  [5, 100000000, 5],
  [-5, 99999999, -5],
  [99, 123456789, 122],
  [-99, 8765432, -9],
  [1000, 110000000, 1100],
  [-1001, 92500000, -926],
];

describe('taux applicable et arrondi', () => {
  it('samedi-taux-du-vendredi', () => {
    // 2027-05-15 est un samedi ; 2027-05-14 un vendredi ; 2027-05-16 un dimanche.
    expect(dateDuTauxApplicable('2027-05-15', '2027-05-20T10:00Z', REGLE)).toBe('2027-05-14');
    expect(dateDuTauxApplicable('2027-05-16', '2027-05-20T10:00Z', REGLE)).toBe('2027-05-14');
    // Le lundi suivant, consulté avant publication : le vendredi (veille ouvrée).
    expect(dateDuTauxApplicable('2027-05-17', '2027-05-17T08:00Z', REGLE)).toBe('2027-05-14');
  });

  it('avant-publication-taux-de-la-veille', () => {
    expect(dateDuTauxApplicable('2027-05-19', '2027-05-19T14:59Z', REGLE)).toBe('2027-05-18');
    expect(dateDuTauxApplicable('2027-05-19', '2027-05-19T00:00Z', REGLE)).toBe('2027-05-18');
    // Consulté avant le jour de l'opération : rien n'est publié encore.
    expect(dateDuTauxApplicable('2027-05-19', '2027-05-18T23:00Z', REGLE)).toBe('2027-05-18');
    // Samedi consulté le vendredi avant publication : le jeudi.
    expect(dateDuTauxApplicable('2027-05-15', '2027-05-14T10:00Z', REGLE)).toBe('2027-05-13');
  });

  it('apres-publication-taux-du-jour', () => {
    expect(dateDuTauxApplicable('2027-05-19', '2027-05-19T15:00Z', REGLE)).toBe('2027-05-19');
    expect(dateDuTauxApplicable('2027-05-19', '2027-05-19T23:59Z', REGLE)).toBe('2027-05-19');
    expect(dateDuTauxApplicable('2027-05-19', '2027-06-02T01:00Z', REGLE)).toBe('2027-05-19');
  });

  it('banc-50-conversions-au-centime', () => {
    expect(BANC).toHaveLength(50);
    for (const [montant, taux, attendu] of BANC) {
      expect(convertirAuCentime(montant, taux, REGLE), `${montant} x ${taux}`).toBe(attendu);
    }
    const demis = BANC.filter(([m, t]) => (Math.abs(m) * t) % 100000000 === 50000000);
    expect(demis.length).toBeGreaterThanOrEqual(10);
    expect(BANC.some(([m]) => m < 0)).toBe(true);
    // Autres modes d'arrondi sur un demi-centime (5 x 1,1 = 5,5 ; -5 x 1,1 = -5,5 ; 4 x 1,125 = 4,5).
    const mode = (arrondi: RegleChange['arrondi']) => ({ ...REGLE, arrondi });
    expect(convertirAuCentime(5, 110000000, mode('demi_pair'))).toBe(6);
    expect(convertirAuCentime(4, 112500000, mode('demi_pair'))).toBe(4);
    expect(convertirAuCentime(-5, 110000000, mode('demi_pair'))).toBe(-6);
    expect(convertirAuCentime(-5, 110000000, mode('demi_loin_de_zero'))).toBe(-6);
    // Juste sous et juste au-dessus du demi.
    expect(convertirAuCentime(1, 49999999, REGLE)).toBe(0);
    expect(convertirAuCentime(1, 50000001, REGLE)).toBe(1);
    expect(convertirAuCentime(-1, 49999999, REGLE)).toBe(0);
    for (const mauvais of [Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => convertirAuCentime(mauvais, 110000000, REGLE)).toThrow(ErreurChange);
    }
    for (const mauvais of [0, -1, Number.NaN, 1.5]) {
      expect(() => convertirAuCentime(100, mauvais, REGLE)).toThrow(ErreurChange);
    }
    expect(() => convertirAuCentime(100, 110000000, { ...REGLE, arrondi: 'inconnu' as never })).toThrow(ErreurChange);
    expect(() => dateDuTauxApplicable('2027-02-30', '2027-05-19T10:00Z', REGLE)).toThrow(ErreurChange);
    expect(() => dateDuTauxApplicable('2027-05-19', 'hier', REGLE)).toThrow(ErreurChange);
    expect(() =>
      dateDuTauxApplicable('2027-05-19', '2027-05-19T10:00Z', { ...REGLE, heurePublicationUtc: '25:00' }),
    ).toThrow(ErreurChange);
  });

  it('regle-lue-du-parametre-date', () => {
    const ligne = (debut: string, fin: string | null, heure: string, arrondi: string, statut = 'a_verifier') => ({
      cle: 'change.bce.regle',
      pays: 'FR',
      effet_debut: debut,
      effet_fin: fin,
      statut,
      valeur: JSON.stringify({ heurePublicationUtc: heure, arrondi, jourSansCotation: 'veille_ouvree' }),
    });
    const lignes = [
      ligne('2027-01-01', '2028-01-01', '15:00', 'demi_loin_de_zero'),
      ligne('2028-01-01', null, '13:00', 'demi_pair'),
      ligne('2029-01-01', null, '10:00', 'demi_pair', 'retire'),
    ];
    const avant = regleChangeAuJour(lignes, 'FR', '2027-12-31');
    const apres = regleChangeAuJour(lignes, 'FR', '2028-01-01');
    expect(avant).toEqual({ heurePublicationUtc: '15:00', arrondi: 'demi_loin_de_zero', jourSansCotation: 'veille_ouvree' });
    expect(apres.heurePublicationUtc).toBe('13:00');
    // Même instant, deux règles : le résultat suit le paramètre daté.
    expect(dateDuTauxApplicable('2027-12-30', '2027-12-30T14:00Z', avant)).toBe('2027-12-29');
    expect(dateDuTauxApplicable('2027-12-30', '2027-12-30T14:00Z', apres)).toBe('2027-12-30');
    expect(convertirAuCentime(5, 110000000, avant)).toBe(6);
    expect(convertirAuCentime(4, 112500000, apres)).toBe(4);
    // Ligne retirée ignorée ; aucune ligne : erreur ; autre pays ignoré.
    expect(regleChangeAuJour(lignes, 'FR', '2029-06-01').heurePublicationUtc).toBe('13:00');
    expect(() => regleChangeAuJour(lignes, 'FR', '2026-12-31')).toThrow(ErreurChange);
    expect(() => regleChangeAuJour(lignes, 'DE', '2027-06-01')).toThrow(ErreurChange);
    expect(() =>
      regleChangeAuJour([{ ...lignes[0]!, valeur: '{"arrondi":"x"}' }], 'FR', '2027-06-01'),
    ).toThrow(ErreurChange);
  });
});
