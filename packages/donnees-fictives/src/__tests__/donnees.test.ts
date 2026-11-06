import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { genererDonnees, serialiser, sirenValide } from '../index.js';

const NOMS_PERMIS = ['Lemoine Rénovation', 'Immobilière Marceau', 'Boulangerie Rivoire', 'Garage Fontaine', 'Atelier Bertin'];

describe('données fictives v1', () => {
  const jeu = genererDonnees();

  it('contient sept sociétés aux profils attendus', () => {
    expect(jeu.societes.map((s) => s.profil)).toEqual(['pleine', 'vide', 'en_formation', 'franchise', 'micro', 'tva_encaissements', 'charge']);
  });

  it('est identique à chaque génération avec la même graine', () => {
    expect(serialiser(genererDonnees())).toBe(serialiser(genererDonnees()));
    expect(serialiser(genererDonnees(1))).not.toBe(serialiser(jeu));
  });

  it('correspond au fichier versionné donnees/v1.json', () => {
    const fichier = readFileSync(new URL('../../donnees/v1.json', import.meta.url), 'utf8');
    expect(fichier).toBe(serialiser(jeu));
  });

  it('utilise des SIREN valides parmi 123456782 et 987654324, ou aucun', () => {
    for (const s of jeu.societes) {
      if (s.siren === null) expect(s.profil).toBe('en_formation');
      else expect(['123456782', '987654324']).toContain(s.siren);
    }
    expect(sirenValide('123456782')).toBe(true);
    expect(sirenValide('987654324')).toBe(true);
    expect(sirenValide('123456789')).toBe(false);
  });

  it('utilise des devises fictives, des e-mails @exemple.fr et des noms permis', () => {
    for (const s of jeu.societes) {
      expect(s.devise).toMatch(/^XX[A-D]$/);
      expect(s.email).toMatch(/^[a-z]+@exemple\.fr$/);
      expect(NOMS_PERMIS.some((n) => s.nom.startsWith(n))).toBe(true);
    }
  });

  it('respecte les volumes : vide et en formation sans facture, charge la plus fournie', () => {
    const nb = (p: string) => jeu.societes.find((s) => s.profil === p)!.factures.length;
    expect(nb('vide')).toBe(0);
    expect(nb('en_formation')).toBe(0);
    expect(nb('charge')).toBe(60);
    expect(nb('pleine')).toBeGreaterThan(0);
  });

  it('applique la TVA selon le régime et ne contient aucun IBAN', () => {
    for (const s of jeu.societes) {
      if (s.regime_tva === 'franchise_en_base') for (const f of s.factures) expect(f.tva_centimes).toBe(0);
    }
    expect(JSON.stringify(jeu)).not.toMatch(/[A-Z]{2}\d{2}[A-Z0-9]{11,30}/);
  });
});
