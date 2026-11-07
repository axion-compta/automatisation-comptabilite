import { describe, expect, it } from 'vitest';
import { ErreurRequete, correspondMot, lireRequete, normaliser } from '../requete.js';

// Bornes de test inventées, passées par l'appelant (contrat).
const bornes = { min: 2, max: 200 };

function code(q: string): string | undefined {
  try {
    lireRequete(q, bornes);
    return undefined;
  } catch (e) {
    return e instanceof ErreurRequete ? e.code : 'autre';
  }
}

describe('recherche : lecture de la requête', () => {
  it('bornes-exactes', () => {
    expect(code('a')).toBe('requete_invalide');
    expect(code('ab')).toBeUndefined();
    expect(code('a'.repeat(200))).toBeUndefined();
    expect(code('a'.repeat(201))).toBe('requete_invalide');
    // un emoji compte pour 1 caractère (points de code) : 1 + 'a' = 2
    expect(code('😀a')).toBeUndefined();
    expect(code('😀')).toBe('requete_invalide');
    expect(code('😀'.repeat(200))).toBeUndefined();
    expect(code('😀'.repeat(201))).toBe('requete_invalide');
    // les bornes viennent de l'appelant
    expect(() => lireRequete('abc', { min: 4, max: 10 })).toThrow(ErreurRequete);
    expect(lireRequete('abc', { min: 3, max: 3 }).mots).toEqual(['abc']);
    expect(() => lireRequete('abcd', { min: 3, max: 3 })).toThrow(ErreurRequete);
  });

  it('vide-et-espaces-refuses', () => {
    expect(code('')).toBe('requete_invalide');
    expect(code('     ')).toBe('requete_invalide');
    expect(code(' a ')).toBe('requete_invalide');
    expect(code('   a \t')).toBe('requete_invalide');
    expect(code('  ab  ')).toBeUndefined();
  });

  it('sans-accents-ni-majuscules', () => {
    expect(normaliser('  ÉCOLE   Élémentaire\tÀ  Noël ')).toBe('ecole elementaire a noel');
    expect(normaliser('')).toBe('');
    const r = lireRequete('Fournisseur  Électrique', bornes);
    expect(r.mots).toEqual(['fournisseur', 'electrique']);
    expect(r.montantCentimes).toBeUndefined();
    expect(r.siren).toBeUndefined();
  });

  it('montant-avec-espaces-et-euro', () => {
    expect(lireRequete('1234,50', bornes).montantCentimes).toBe(123450);
    expect(lireRequete('1 234,50 €', bornes).montantCentimes).toBe(123450);
    expect(lireRequete('1 234,50', bornes).montantCentimes).toBe(123450);
    expect(lireRequete('1 234,50 €', bornes).montantCentimes).toBe(123450);
    expect(lireRequete('1 234 567,89€', bornes).montantCentimes).toBe(123456789);
    expect(lireRequete('12,00', bornes).montantCentimes).toBe(1200);
    expect(lireRequete('0,05', bornes).montantCentimes).toBe(5);
    expect(lireRequete('1234', bornes).montantCentimes).toBe(123400);
    // groupes mal formés : pas un montant
    expect(lireRequete('12 34,50', bornes).montantCentimes).toBeUndefined();
    expect(lireRequete('1 2345,50', bornes).montantCentimes).toBeUndefined();
    expect(lireRequete('1,234', bornes).montantCentimes).toBeUndefined();
    expect(lireRequete('12,', bornes).montantCentimes).toBeUndefined();
    expect(lireRequete('-12,50', bornes).montantCentimes).toBeUndefined();
    expect(lireRequete('facture 12,50', bornes).montantCentimes).toBeUndefined();
    // au-delà de MAX_SAFE_INTEGER centimes : ignoré
    expect(lireRequete('90 071 992 547 409,92', bornes).montantCentimes).toBeUndefined();
    expect(lireRequete('90 071 992 547 409,91', bornes).montantCentimes).toBe(9007199254740991);
    expect(lireRequete('99999999999999999999,99', bornes).montantCentimes).toBeUndefined();
  });

  it('montant-un-chiffre-apres-virgule', () => {
    expect(lireRequete('12,5', bornes).montantCentimes).toBe(1250);
    expect(lireRequete('0,5 €', bornes).montantCentimes).toBe(50);
    expect(lireRequete('7,0', bornes).montantCentimes).toBe(700);
  });

  it('point-decimal-pas-un-montant', () => {
    const r = lireRequete('12.50', bornes);
    expect(r.montantCentimes).toBeUndefined();
    expect(r.mots).toEqual(['12.50']);
    expect(lireRequete('1.234,50', bornes).montantCentimes).toBeUndefined();
    expect(lireRequete('1 234.50 €', bornes).montantCentimes).toBeUndefined();
  });

  it('siren-neuf-chiffres', () => {
    expect(lireRequete('123456782', bornes).siren).toBe('123456782');
    expect(lireRequete('123 456 782', bornes).siren).toBe('123456782');
    expect(lireRequete('123 456 782', bornes).siren).toBe('123456782');
    expect(lireRequete('  123456782  ', bornes).siren).toBe('123456782');
    expect(lireRequete('12345678a', bornes).siren).toBeUndefined();
    expect(lireRequete('1234 56782', bornes).siren).toBeUndefined();
    expect(lireRequete('société 123456782', bornes).siren).toBeUndefined();
  });

  it('huit-ou-dix-chiffres-pas-un-siren', () => {
    expect(lireRequete('12345678', bornes).siren).toBeUndefined();
    expect(lireRequete('1234567890', bornes).siren).toBeUndefined();
    expect(lireRequete('123 456 7890', bornes).siren).toBeUndefined();
    expect(lireRequete('12 345 678', bornes).siren).toBeUndefined();
  });

  it('dernier-mot-prefixe', () => {
    expect(lireRequete('loyer jan', bornes).dernierEnPrefixe).toBe(true);
    expect(lireRequete('loyer', bornes).mots).toEqual(['loyer']);
    expect(correspondMot('loyer janvier 2026', 'jan', true)).toBe(true);
    expect(correspondMot('loyer janvier 2026', 'jan', false)).toBe(false);
    expect(correspondMot('loyer janvier 2026', 'janvier', false)).toBe(true);
    expect(correspondMot('loyer janvier 2026', 'oyer', true)).toBe(false);
    expect(correspondMot('loyer janvier 2026', 'loyer', false)).toBe(true);
    expect(correspondMot('loyer janvier 2026', '2026', false)).toBe(true);
    expect(correspondMot('loyer janvier 2026', 'janvier2', true)).toBe(false);
    expect(correspondMot('', 'a', true)).toBe(false);
  });

  it('entree-hostile-sans-effet', () => {
    for (const q of ["'; DROP", '<script>', '%00', "'; DROP TABLE ecritures; --", '\u0000ab']) {
      const r = lireRequete(q, bornes);
      expect(r.mots.length).toBeGreaterThan(0);
      expect(r.montantCentimes).toBeUndefined();
      expect(r.siren).toBeUndefined();
    }
    expect(lireRequete("'; DROP", bornes).mots).toEqual(["';", 'drop']);
    expect(lireRequete('<script>', bornes).mots).toEqual(['<script>']);
    expect(lireRequete('%00', bornes).mots).toEqual(['%00']);
  });
});
