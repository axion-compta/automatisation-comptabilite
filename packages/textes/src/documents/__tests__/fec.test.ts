import { describe, expect, it } from 'vitest';
import { encadreFec, noticeFec, rapportFec, type ParametresNoticeFec } from '../fec.js';

const PARAMS: ParametresNoticeFec = {
  journaux: [{ code: 'VE', libelle: 'Ventes' }, { code: 'AC', libelle: 'Achats' }],
  numerotation: 'par_journal',
  journalANouveaux: 'AN',
  conventionSansPiece: 'Une opération sans pièce porte la mention SANS-PIECE.',
  separateurNom: 'une tabulation fictive',
  encodageNom: 'un encodage fictif',
  marqueOrdre: true,
};

function textes(): string[] {
  const n = noticeFec(PARAMS);
  return [encadreFec(3), n.titre, ...n.rubriques.flatMap((r) => [r.titre, r.texte]), ...Object.values(rapportFec)];
}

describe('textes du FEC', () => {
  it('encadre-texte-exact', () => {
    expect(encadreFec(12)).toBe(
      "Préparé par IA à partir de vos opérations validées. Contrôle de structure : 12 règles vérifiées. À faire vérifier par votre expert-comptable avant toute remise à l'administration. Conservez vos justificatifs originaux.",
    );
    expect(encadreFec(0)).toContain('0 règle vérifiée.');
    for (const mauvais of [NaN, Infinity, -Infinity, -1, 1.5]) {
      expect(() => encadreFec(mauvais)).toThrow();
    }
  });

  it('encadre-singulier', () => {
    expect(encadreFec(1)).toContain('Contrôle de structure : 1 règle vérifiée. À faire');
    expect(encadreFec(1)).not.toContain('règles');
    expect(encadreFec(2)).toContain('2 règles vérifiées');
  });

  it('notice-sept-rubriques-dans-l-ordre', () => {
    const n = noticeFec(PARAMS);
    expect(n.rubriques.map((r) => r.titre)).toEqual([
      'Journaux',
      'Mode de numérotation',
      'Repérage des à-nouveaux',
      'Opérations sans pièce',
      'Sens de ValidDate',
      'Encodage',
      'Séparateur',
    ]);
    for (const r of n.rubriques) expect(r.texte.trim().length).toBeGreaterThan(0);
    expect(noticeFec({ ...PARAMS, journaux: [] }).rubriques[0]?.texte).toBe('Aucun journal dans ce fichier.');
  });

  it('notice-reprend-les-parametres', () => {
    const n = noticeFec(PARAMS);
    const t = (i: number): string => n.rubriques[i]?.texte ?? '';
    expect(t(0)).toBe('VE : Ventes ; AC : Achats');
    expect(t(1)).toContain('repart à chaque journal');
    expect(t(1)).toContain('Une marque');
    expect(t(2)).toContain('journal AN');
    expect(t(3)).toBe(PARAMS.conventionSansPiece);
    expect(t(5)).toContain('un encodage fictif');
    expect(t(6)).toContain('une tabulation fictive');
    const autre = noticeFec({ ...PARAMS, numerotation: 'continue', marqueOrdre: false, separateurNom: 'X', encodageNom: 'Y' });
    expect(autre.rubriques[1]?.texte).toContain('est continue');
    expect(autre.rubriques[1]?.texte).toContain('Aucune marque');
    expect(autre.rubriques[5]?.texte).toContain('Y');
    expect(autre.rubriques[6]?.texte).toContain('X');
  });

  it('vouvoiement', () => {
    const tutoiement = /(?<![\p{L}\p{N}_])(tu|ton|ta|tes|toi|te)(?![\p{L}\p{N}_])/iu;
    for (const t of textes()) expect(t).not.toMatch(tutoiement);
    expect(encadreFec(2)).toContain('vos ');
  });

  it('aucun-mot-interdit', () => {
    const mots = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join(''));
    for (const t of textes()) {
      for (const m of mots) expect(t.toLowerCase()).not.toContain(m.toLowerCase());
    }
  });
});
