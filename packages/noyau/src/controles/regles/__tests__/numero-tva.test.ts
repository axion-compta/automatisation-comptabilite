import { describe, expect, it } from 'vitest';
import { analyserNumeroTva, regleCCK09, sirenValide } from '../numero-tva.js';

const statut = (s: string) => analyserNumeroTva(s).statut;

describe('CC-K09 numéro de TVA intracommunautaire', () => {
  it('CT-09', () => {
    expect(statut('FR11123456782')).toBe('cle_juste');
    expect(statut('FR12123456782')).toBe('cle_fausse');
    expect(statut('FRAB123456782')).toBe('remplissage');
    expect(regleCCK09.evaluer('FR11123456782')).toEqual({ resultat: 'OK' });
    expect(regleCCK09.evaluer('FR12123456782')).toEqual({ resultat: 'ALERTE', valeur: 'cle_fausse' });
    expect(regleCCK09.evaluer('FRAB123456782')).toEqual({ resultat: 'ALERTE', valeur: 'remplissage' });
    expect(regleCCK09).toMatchObject({ id: 'CC-K09', version: 1, gravite: 'M', bloque: [], actif: true });
    expect(regleCCK09.declencheurs).toEqual(['arrivee', 'a_la_demande']);
  });

  it('espaces-et-minuscules-acceptes', () => {
    expect(statut('fr 11 123 456 782')).toBe('cle_juste');
    expect(statut(' FR11\t123456782 ')).toBe('cle_juste');
  });

  it('zeros-remplissage', () => {
    expect(statut('FR00000000000')).toBe('remplissage');
    expect(statut('FR11000000000')).toBe('remplissage');
  });

  it('siren-luhn-faux', () => {
    expect(sirenValide('123456782')).toBe(true);
    expect(sirenValide('123456783')).toBe(false);
    expect(statut('FR44444444440')).toBe('remplissage');
  });

  it('longueur-fausse', () => {
    expect(statut('FR1112345678')).toBe('format_invalide');
    expect(statut('FR111234567822')).toBe('format_invalide');
    expect(statut('FR11A23456782')).toBe('format_invalide');
    expect(sirenValide('12345678')).toBe(false);
    expect(sirenValide('1234567820')).toBe(false);
    expect(sirenValide('12345678A')).toBe(false);
    expect(regleCCK09.evaluer('FR1112345678')).toEqual({ resultat: 'ALERTE', valeur: 'format_invalide' });
  });

  it('chaine-vide', () => {
    expect(statut('')).toBe('format_invalide');
    expect(statut('   ')).toBe('format_invalide');
    expect(statut('1234')).toBe('format_invalide');
    expect(regleCCK09.evaluer('')).toEqual({ resultat: 'ALERTE', valeur: 'format_invalide' });
  });

  it('autre-pays-non-applicable', () => {
    expect(statut('DE123456789')).toBe('hors_france');
    expect(statut('be0123456789')).toBe('hors_france');
    expect(regleCCK09.evaluer('DE123456789')).toEqual({ resultat: 'NON_APPLICABLE' });
  });

  it('cle-calculee-sur-3-siren', () => {
    // SIREN fictifs ; clés attendues écrites en dur.
    const cas: [string, string][] = [
      ['123456782', '11'],
      ['111111118', '44'],
      ['222222226', '46'],
    ];
    for (const [siren, cle] of cas) {
      expect(statut(`FR${cle}${siren}`)).toBe('cle_juste');
      const autre = String((Number(cle) + 1) % 97).padStart(2, '0');
      expect(statut(`FR${autre}${siren}`)).toBe('cle_fausse');
    }
  });
});
