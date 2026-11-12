import { describe, expect, it } from 'vitest';
import { domaineOfficiel } from '../../source.js';
import { CORRESPONDANCE_CGI_CIBS as T } from '../cgi-cibs.js';
import { CATALOGUE_IS_SOCIETES as C } from '../is-societes.js';

describe('table CGI vers CIBS', () => {
  it('aucune-ligne-valide-et-numero-non-confirme-reste-null', () => {
    expect(T.map((l) => l.articleCgi)).toEqual(['293 B', '269', '289 bis']);
    for (const l of T) {
      expect(l.statut).toBe('a_verifier');
      expect(l.source.trim()).not.toBe('');
      expect(l.debut).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    }
    expect(T.filter((l) => l.articleCibs === null).map((l) => l.articleCgi)).toEqual(['269', '289 bis']);
  });

  it('article-293-b-coherent-avec-le-catalogue', () => {
    const l = T.find((x) => x.articleCgi === '293 B')!;
    const cibs = C.find((x) => x.cle === 'tva.franchise.mention' && x.effet_fin === null)!;
    expect(cibs.valeur).toContain(l.articleCibs!);
    expect(l.debut).toBe(cibs.effet_debut);
    expect(domaineOfficiel(cibs.source_url)).toBe(true);
  });

  it('articles-uniques', () => {
    expect(new Set(T.map((l) => l.articleCgi)).size).toBe(T.length);
  });
});
