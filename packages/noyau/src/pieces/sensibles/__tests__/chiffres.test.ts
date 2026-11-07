import { describe, expect, it } from 'vitest';
import { ErreurPiece } from '../../types.js';
import { cleLuhnValide, cleNirValide, detecterChiffres, ibanValide, masquer } from '../chiffres.js';

// Aides de test indépendantes du code testé (BigInt) ; toutes les valeurs sont construites à l'exécution.
const luhnOk = (s: string): boolean => {
  let t = 0;
  [...s].reverse().forEach((c, i) => { const d = Number(c) * (i % 2 === 1 ? 2 : 1); t += d > 9 ? d - 9 : d; });
  return t % 10 === 0;
};
const completerLuhn = (corps: string): string => { for (let d = 0; d < 10; d++) if (luhnOk(corps + d)) return corps + d; throw new Error('impossible'); };
const carteFinissantPar1234 = (): string => { for (let d = 0; d < 10; d++) { const c = '40001234567' + d + '1234'; if (luhnOk(c)) return c; } throw new Error('impossible'); };
const completerNir = (n13: string): string => { const n = BigInt(n13.replace('2A', '19').replace('2B', '18')); return n13 + String(97n - (n % 97n)).padStart(2, '0'); };
const fabriquerIban = (pays: string, bban: string): string => {
  const lettres = [...(bban + pays + '00')].map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 55))).join('');
  return pays + String(98n - (BigInt(lettres) % 97n)).padStart(2, '0') + bban;
};
const groupes = (s: string, sep = ' '): string => s.replace(/(.{4})(?=.)/g, '$1' + sep);

describe('chiffres sensibles', () => {
  it('luhn-valide-et-invalide', () => {
    const ok = completerLuhn('411100002222333');
    expect(cleLuhnValide(ok)).toBe(true);
    for (let d = 1; d < 10; d++) expect(cleLuhnValide(ok.slice(0, -1) + ((Number(ok.at(-1)) + d) % 10))).toBe(false);
    for (const v of ['', 'abc', ok + 'x', ' ' + ok]) expect(cleLuhnValide(v)).toBe(false);
  });
  it('carte-16-chiffres-masquee', () => {
    const c = carteFinissantPar1234();
    const texte = `Paiement carte ${c} accepté`;
    const d = detecterChiffres(texte);
    expect(d).toEqual([{ motif: 'carte_paiement', debut: 15, fin: 31 }]);
    expect(masquer(texte, d)).toBe('Paiement carte **** 1234 accepté');
  });
  it('carte-avec-espaces-et-tirets', () => {
    const c = carteFinissantPar1234();
    for (const sep of [' ', '-', ' ', ' ', '.']) {
      const texte = `a ${groupes(c, sep)} b`;
      expect(detecterChiffres(texte)).toEqual([{ motif: 'carte_paiement', debut: 2, fin: 2 + 19 }]);
      expect(masquer(texte, detecterChiffres(texte))).toBe('a **** 1234 b');
    }
    const c13 = completerLuhn('400012345678');
    expect(detecterChiffres(c13)).toHaveLength(1);
    expect(detecterChiffres(completerLuhn('4000123456789012345'.slice(0, 18)))).toHaveLength(1);
  });
  it('nombre-hors-luhn-non-masque', () => {
    const ok = completerLuhn('400012345678901');
    const faux = ok.slice(0, -1) + ((Number(ok.at(-1)) + 1) % 10);
    expect(detecterChiffres(`n° ${faux} total 1.234,56 le 2024-01-15`)).toEqual([]);
    expect(detecterChiffres(completerLuhn('40001234567'))).toEqual([]);
  });
  it('nir-cle-valide-masque', () => {
    const nir = completerNir('1920312345678');
    expect(cleNirValide(nir)).toBe(true);
    expect(cleNirValide(nir.slice(0, 13) + String((Number(nir.slice(13)) % 97) + 1).padStart(2, '0'))).toBe(false);
    const sep = `${nir[0]} ${nir.slice(1, 3)} ${nir.slice(3, 5)} ${nir.slice(5, 7)} ${nir.slice(7, 10)} ${nir.slice(10, 13)} ${nir.slice(13)}`;
    const texte = `NIR ${sep}.`;
    const d = detecterChiffres(texte);
    expect(d).toEqual([{ motif: 'nir', debut: 4, fin: 4 + sep.length }]);
    expect(masquer(texte, d)).toBe('NIR * ** ** ** *** *** **.');
    expect(detecterChiffres(`NIR ${nir}`)).toEqual([{ motif: 'nir', debut: 4, fin: 19 }]);
  });
  it('nir-corse-2a', () => {
    for (const dep of ['2A', '2B']) {
      const nir = completerNir(`19203${dep}123456`);
      expect(cleNirValide(nir)).toBe(true);
      expect(detecterChiffres(`x ${nir} y`)).toEqual([{ motif: 'nir', debut: 2, fin: 17 }]);
      expect(masquer(`x ${nir} y`, detecterChiffres(`x ${nir} y`))).toBe('x *************** y');
    }
    const a = completerNir('19203' + '2A123456');
    expect(cleNirValide(a.slice(0, 5) + '2B' + a.slice(7))).toBe(false);
    expect(cleNirValide(a.toLowerCase())).toBe(false);
  });
  it('nir-cle-fausse-non-masque', () => {
    const nir = completerNir('2870412345678');
    const faux = nir.slice(0, 13) + String((Number(nir.slice(13)) + 1) % 97).padStart(2, '0');
    expect(cleNirValide(faux)).toBe(false);
    expect(detecterChiffres(`NIR ${faux}`)).toEqual([]);
    for (const v of ['', nir.slice(1), '3' + nir.slice(1), nir + '0', 'abc']) expect(cleNirValide(v)).toBe(false);
    expect(detecterChiffres(`${nir}9`).map((x) => x.motif)).not.toContain('nir');
  });
  it('iban-masque-sauf-4-derniers', () => {
    const iban = fabriquerIban('FR', 'ABCDE12345' + 'F6789012345');
    expect(ibanValide(iban)).toBe(true);
    expect(ibanValide(groupes(iban).toLowerCase())).toBe(true);
    expect(ibanValide(iban.slice(0, -1) + 'Z')).toBe(false);
    for (const v of ['', 'FR76', 'FR' + iban.slice(2, 8), '12' + iban.slice(2)]) expect(ibanValide(v)).toBe(false);
    const texte = `Virement ${groupes(iban)} merci`;
    const d = detecterChiffres(texte);
    expect(d).toEqual([{ motif: 'iban', debut: 9, fin: 9 + groupes(iban).length }]);
    const m = masquer(texte, d);
    expect(m).toHaveLength(texte.length);
    expect(m).toBe('Virement ' + '*'.repeat(groupes(iban).length - 4) + groupes(iban).slice(-4) + ' merci');
    expect(detecterChiffres(iban)).toEqual([{ motif: 'iban', debut: 0, fin: iban.length }]);
  });
  it('chevauchement-iban-prime', () => {
    const bban = completerLuhn('400012345678901') + '1234567';
    expect(detecterChiffres(bban).map((x) => x.motif)).toEqual(['carte_paiement']);
    const iban = fabriquerIban('FR', bban);
    expect(detecterChiffres(`${iban}`)).toEqual([{ motif: 'iban', debut: 0, fin: iban.length }]);
    const nir = completerNir('1920312345678');
    const deux = detecterChiffres(`${nir} / ${iban}`);
    expect(deux.map((x) => x.motif)).toEqual(['nir', 'iban']);
    expect(deux[0]!.debut).toBeLessThan(deux[1]!.debut);
    expect(() => masquer('abc', [{ motif: 'nir', debut: 2, fin: 9 }])).toThrow(ErreurPiece);
    expect(() => masquer('abcdef', [{ motif: 'nir', debut: 3, fin: 5 }, { motif: 'nir', debut: 1, fin: 2 }])).toThrow(ErreurPiece);
  });
  it('texte-vide-et-sans-chiffre', () => {
    for (const t of ['', 'Facture de la société Exemple', '12 34', '---', 'FR76']) {
      expect(detecterChiffres(t)).toEqual([]);
      expect(masquer(t, [])).toBe(t);
    }
  });
});
