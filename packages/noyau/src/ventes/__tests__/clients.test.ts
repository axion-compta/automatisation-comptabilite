import { describe, expect, it } from 'vitest';
import { chercherClient, normaliserNom, peutValiderFacture, proposerFiche, prochainCodeAuxiliaire } from '../clients.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const SIREN = '987654324';
const A = { id: 'a', nom: 'Immobilière Marceau', siren: SIREN, tva: 'XX 111 222' };
const B = { id: 'b', nom: 'Atelier Bertin', tva: 'XX333444' };
const C = { id: 'c', nom: 'Boulangerie Rivoire' };
const D = { id: 'd', nom: 'Rivoire' };

describe('clients', () => {
  it('trouve-par-siren-d-abord', () => {
    const r = chercherClient([B, A], { siren: '987 654 324', tva: 'XX333444', nom: 'Atelier Bertin' });
    expect(r).toEqual({ client: A, par: 'siren' });
    expect(chercherClient([A], { siren: ' ', tva: 'XX111222' })?.par).toBe('tva');
  });

  it('trouve-par-tva-si-pas-de-siren', () => {
    expect(chercherClient([A, B], { siren: '000000000', tva: ' XX 333 444 ', nom: 'Immobilière Marceau' })).toEqual({ client: B, par: 'tva' });
    expect(chercherClient([A, B], { tva: 'XX111222' })?.client).toBe(A);
    expect(chercherClient([C], { tva: '' })).toBeNull();
  });

  it('trouve-par-nom-normalise', () => {
    expect(normaliserNom('IMMOBILIÈRE  Marceau')).toBe('immobiliere marceau');
    expect(normaliserNom('  Rivoire & Fils, S.A.R.L. ')).toBe('rivoire fils s a r l');
    expect(normaliserNom('Àéîõü-ç')).toBe('aeiou c');
    expect(chercherClient([A], { nom: 'immobiliere marceau' })).toEqual({ client: A, par: 'nom' });
    expect(chercherClient([C, D], { nom: 'RIVOIRE' })?.client).toBe(D);
    expect(chercherClient([C, D], { nom: 'rivoire' })?.client).toBe(D);
  });

  it('absent-donne-null', () => {
    expect(chercherClient([], { siren: SIREN })).toBeNull();
    expect(chercherClient([A, B], {})).toBeNull();
    expect(chercherClient([A, B], { nom: '   ' })).toBeNull();
    expect(chercherClient([{ id: 'x', nom: '!!!' }], { nom: '...' })).toBeNull();
    expect(chercherClient([{ id: 'x', nom: 'Y', siren: '', tva: '' }], { siren: '', tva: '' })).toBeNull();
    expect(chercherClient([A], { siren: '111111111', tva: 'ZZ', nom: 'Autre' })).toBeNull();
  });

  it('proposition-professionnel-ou-a-confirmer', () => {
    expect(proposerFiche({ nom: 'Atelier Bertin', siren: SIREN })).toEqual({ origine: 'proposition_ia', nature: 'professionnel', nom: 'Atelier Bertin', siren: SIREN });
    expect(proposerFiche({ nom: 'N', tva: 'XX111222', codePostal: '00000' })).toEqual({ origine: 'proposition_ia', nature: 'professionnel', nom: 'N', tva: 'XX111222', codePostal: '00000' });
    expect(proposerFiche({ nom: 'Camille Vasseur' })).toEqual({ origine: 'proposition_ia', nature: 'a_confirmer', nom: 'Camille Vasseur' });
    expect(proposerFiche({ nom: 'M', siren: '  ', tva: '' }).nature).toBe('a_confirmer');
  });

  it('code-auxiliaire-suivant', () => {
    const o = { prefixe: 'C', chiffres: 6 };
    expect(prochainCodeAuxiliaire(['C000044', 'C000007'], o)).toBe('C000045');
    expect(prochainCodeAuxiliaire(['C000007', 'C000044'], o)).toBe('C000045');
    expect(prochainCodeAuxiliaire([], o)).toBe('C000001');
    expect(prochainCodeAuxiliaire(['F000900', 'C', 'Cabc', 'C12x', 'C000002'], o)).toBe('C000003');
    expect(prochainCodeAuxiliaire(['C09'], { prefixe: 'C', chiffres: 3 })).toBe('C010');
    expect(prochainCodeAuxiliaire([], { prefixe: 'C', chiffres: 1 })).toBe('C1');
    expect(prochainCodeAuxiliaire(['C998'], { prefixe: 'C', chiffres: 3 })).toBe('C999');
    expect(prochainCodeAuxiliaire(['C99999999999'], { prefixe: 'C', chiffres: 12 })).toBe('C100000000000');
  });

  it('code-auxiliaire-epuise', () => {
    expect(code(() => prochainCodeAuxiliaire(['C999'], { prefixe: 'C', chiffres: 3 }))).toBe('code_auxiliaire_epuise');
    expect(code(() => prochainCodeAuxiliaire(['C9'], { prefixe: 'C', chiffres: 1 }))).toBe('code_auxiliaire_epuise');
  });

  it('facture-sans-client-non-validable', () => {
    const base = { id: 'p', type: 'facture', origine: 'depot', numero: '1', dateFacture: '2026-01-02', htCentimes: 0, tvaCentimes: 0, ttcCentimes: 0, statut: 'lue' } as never;
    expect(peutValiderFacture(base)).toBe(false);
    expect(peutValiderFacture({ ...(base as object), clientId: '' } as never)).toBe(false);
    expect(peutValiderFacture({ ...(base as object), clientId: 'a' } as never)).toBe(true);
  });

  it('entrees-invalides', () => {
    const e = (chiffres: number, prefixe = 'C'): string | undefined => code(() => prochainCodeAuxiliaire([], { prefixe, chiffres }));
    for (const n of [0, 13, 1.5, Number.NaN, Number.POSITIVE_INFINITY, -1]) expect(e(n)).toBe('entree_invalide');
    expect(e(6, '')).toBe('entree_invalide');
    expect(code(() => prochainCodeAuxiliaire('x' as never, { prefixe: 'C', chiffres: 6 }))).toBe('entree_invalide');
    expect(e(12)).toBeUndefined();
  });
});
