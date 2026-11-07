import { describe, expect, it } from 'vitest';
import { sourcesValidation } from '../sources-validation.js';

const CODES = [
  'nature_jamais_sure',
  'lecture_douteuse',
  'fournisseur_peu_valide',
  'anomalie_ouverte',
  'montant_au_seuil_ou_plus',
  'fournisseur_hors_union',
  'tva_en_doute',
  'compte_absent',
];

function feuilles(o: unknown): string[] {
  if (typeof o === 'string') return [o];
  if (typeof o === 'function') return [(o as (...a: string[]) => string)('Camille Inventée', '2026-01-15') as string];
  if (typeof o === 'object' && o !== null) return Object.values(o).flatMap(feuilles);
  return [];
}

const tousLesTextes = [
  ...feuilles(sourcesValidation),
  sourcesValidation.tva.bloquee(1),
  sourcesValidation.tva.bloquee(2),
];

describe('sourcesValidation', () => {
  it('tva-bloquee-singulier-et-pluriel', () => {
    expect(sourcesValidation.tva.bloquee(1)).toContain('1 pièce à lever');
    expect(sourcesValidation.tva.bloquee(1)).not.toContain('pièces');
    expect(sourcesValidation.tva.bloquee(2)).toContain('2 pièces à lever');
    expect(sourcesValidation.tva.bloquee(5)).toContain('5 pièces à lever');
  });

  it('tva-bloquee-texte-de-la-spec', () => {
    expect(sourcesValidation.tva.bloquee(2)).toBe('TVA bloquée : 2 pièces à lever');
    expect(sourcesValidation.tva.bloquee(1)).toBe('TVA bloquée : 1 pièce à lever');
  });

  it('cas limites de bloquee : jamais d’exception, toujours une chaîne', () => {
    for (const n of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => sourcesValidation.tva.bloquee(n)).not.toThrow();
      expect(typeof sourcesValidation.tva.bloquee(n)).toBe('string');
    }
    // 0 pièce : la fonction n'est pas appelée par l'écran, le texte rendu est quand même fixé.
    expect(sourcesValidation.tva.bloquee(0)).toBe('TVA bloquée : 0 pièces à lever');
  });

  it('une-raison-par-code-du-cas-sur', () => {
    expect(Object.keys(sourcesValidation.casSur).sort()).toEqual([...CODES].sort());
    const phrases = CODES.map((c) => sourcesValidation.casSur[c as keyof typeof sourcesValidation.casSur]);
    for (const p of phrases) expect(p.trim().length).toBeGreaterThan(10);
    expect(new Set(phrases).size).toBe(CODES.length);
  });

  it('aucun-chiffre-estime', () => {
    for (const t of tousLesTextes) {
      expect(t.toLowerCase()).not.toMatch(/environ|estimé|à peu près/);
    }
  });

  it('vouvoiement', () => {
    for (const t of tousLesTextes) {
      expect(t.toLowerCase()).not.toMatch(/(^|[^\p{L}])(tu|toi|ton|ta|tes|te|t')([^\p{L}]|$)/u);
    }
    expect(tousLesTextes.some((t) => /\bvous|vos|votre|[a-zé]ez\b/i.test(t))).toBe(true);
  });

  it('aucun-mot-interdit', () => {
    const interdits = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join(''));
    for (const t of tousLesTextes) {
      for (const m of interdits) expect(t.toLowerCase()).not.toContain(m.toLowerCase());
    }
  });

  it('bandeau-veille-texte-de-la-spec', () => {
    expect(sourcesValidation.veille.reglesPossiblementPerimees).toBe('Règles possiblement périmées : à vérifier');
  });

  it('aucun texte ne dit que le logiciel paie, dépose ou transmet', () => {
    for (const t of tousLesTextes) {
      expect(t.toLowerCase()).not.toMatch(/nous (payons|déposons|transmettons|envoyons)|est (déposée?|transmise?|envoyée?)/);
    }
  });

  it('textes de la TVA payée, des connecteurs et de Sirene', () => {
    expect(sourcesValidation.tva.payee('Camille Inventée', '15 janvier')).toBe('TVA payée par Camille Inventée, le 15 janvier');
    expect(sourcesValidation.sirene.etablissementFerme).toContain('Établissement fermé : vérifiez');
    expect(sourcesValidation.sirene.saisieManuelle).toContain('à la main');
    expect(sourcesValidation.connecteurs.degrade).toContain('à la main');
    expect(sourcesValidation.connecteurs.enPanne).toContain('demain');
    expect(sourcesValidation.tva.aConfirmer).toBe('Montant à confirmer');
    expect(sourcesValidation.tva.interrupteurVerrouille).toContain('verrouillé');
  });
});
