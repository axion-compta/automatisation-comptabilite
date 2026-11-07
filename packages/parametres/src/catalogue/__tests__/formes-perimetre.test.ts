import { describe, expect, it } from 'vitest';
import { MATRICE_FORMES, PERIMETRE } from '../formes-perimetre.js';

const de = (c: string) => MATRICE_FORMES.filter((l) => l.comportement === c).map((l) => l.forme).sort();

describe('formes-perimetre', () => {
  it('chaque-forme-du-mvp-a-ses-lignes', () => {
    for (const f of ['EI', 'EURL', 'SARL', 'SASU', 'SAS', 'SCI']) {
      expect(MATRICE_FORMES.some((l) => l.forme === f || l.forme.startsWith(f + '_'))).toBe(true);
    }
    expect(de('impot_par_defaut')).toEqual(['EI', 'EURL_PM', 'EURL_PP', 'SARL', 'SAS', 'SASU', 'SCI']);
  });

  it('compte-exploitant-ei-seulement', () => {
    expect(de('compte_exploitant')).toEqual(['EI']);
  });

  it('courant-associe-societes-seulement', () => {
    expect(de('compte_courant_associe')).toEqual(['EURL', 'SARL', 'SAS', 'SASU', 'SCI']);
    expect(de('compte_courant_associe')).not.toContain('EI');
    expect(de('compte_capital')).toEqual(['EURL', 'SARL', 'SAS', 'SASU']);
    expect(de('dividendes')).toEqual(['EURL_PM', 'SARL', 'SAS', 'SASU']);
  });

  it('impot-par-defaut-a-confirmer', () => {
    const l = MATRICE_FORMES.filter((x) => x.comportement === 'impot_par_defaut');
    expect(l.length).toBeGreaterThan(0);
    for (const x of l) expect(x.statut).toBe('a_verifier');
    for (const x of MATRICE_FORMES) expect(x.statut).not.toBe('valide');
  });

  it('une-ligne-par-couple', () => {
    const cles = MATRICE_FORMES.map((l) => `${l.forme}|${l.comportement}`);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it('perimetre-prefixes-chiffres', () => {
    const p = PERIMETRE.prefixesPostauxExclus;
    expect(p.length).toBeGreaterThan(0);
    for (const x of p) expect(x).toMatch(/^[0-9]{2,3}$/);
    expect(new Set(p).size).toBe(p.length);
    expect(PERIMETRE.formesHorsPerimetre.length).toBeGreaterThan(0);
    expect(PERIMETRE.statut).not.toBe('valide');
  });

  it('sources-et-valeurs-non-vides', () => {
    for (const l of MATRICE_FORMES) {
      expect(l.source.trim()).not.toBe('');
      expect(l.valeur.trim()).not.toBe('');
      expect(l.date_releve).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (l.comportement.startsWith('compte_')) expect(l.valeur).toMatch(/^[0-9]+$/);
    }
    expect(PERIMETRE.source.trim()).not.toBe('');
    expect(PERIMETRE.source_titre).toBe('périmètre du produit, spec 09 §01 règle 6');
  });
});
