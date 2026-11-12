import { describe, expect, it } from 'vitest';
import { citerReference } from '../references.js';
import type { LigneCorrespondance } from '../references.js';

// Table fictive (le paquet des paramètres n'est pas importé ici).
const table: LigneCorrespondance[] = [
  { articleCgi: '10 X', articleCibs: 'L. 1-1', debut: '2030-01-01', statut: 'a_verifier' },
  { articleCgi: '20 Y', articleCibs: null, debut: '2030-01-01', statut: 'a_verifier' },
];

describe('citerReference', () => {
  it('citation-avant-bascule-cgi', () => {
    expect(citerReference('10 X', '2029-12-31', table)).toEqual({ texte: 'art. 10 X du CGI', statut: 'a_verifier' });
    expect(citerReference('20 Y', '2029-12-31', table)).toEqual({ texte: 'art. 20 Y du CGI', statut: 'a_verifier' });
  });

  it('citation-apres-bascule-cibs', () => {
    expect(citerReference('10 X', '2030-01-01', table)).toEqual({ texte: 'art. L. 1-1 du CIBS', statut: 'a_verifier' });
    expect(citerReference('10 X', '2031-05-02', table)).toEqual({ texte: 'art. L. 1-1 du CIBS', statut: 'a_verifier' });
  });

  it('article-inconnu-aucune-citation', () => {
    expect(citerReference('99 Z', '2029-01-01', table)).toEqual({ code: 'reference_inconnue' });
    expect(citerReference('99 Z', '2031-01-01', table)).toEqual({ code: 'reference_inconnue' });
    expect(citerReference('10 X', '2031-01-01', [])).toEqual({ code: 'reference_inconnue' });
  });

  it('numero-cibs-non-confirme-jamais-invente', () => {
    expect(citerReference('20 Y', '2030-01-01', table)).toEqual({ code: 'reference_inconnue' });
  });

  it('statut-repris-de-la-ligne', () => {
    const t: LigneCorrespondance[] = [{ articleCgi: 'A', articleCibs: 'B', debut: '2030-01-01', statut: 'valide' }];
    expect(citerReference('A', '2030-01-01', t)).toEqual({ texte: 'art. B du CIBS', statut: 'valide' });
  });

  it('date-invalide-exception', () => {
    for (const d of ['', '2030-13-01', '2030-02-30', '1/1/2030', 'abc']) {
      expect(() => citerReference('10 X', d, table)).toThrow('entree_invalide');
    }
  });
});
