// Banc du profil 2, cas P19 à P21 de la spec 09 (05-cas-de-test.md), sur les catalogues L09-T27.
import { describe, expect, it } from 'vitest';
import { ErreurParametre, parametreAuJour, type ParametreLegal } from '../au-jour.js';
import { CATALOGUE_IS_SOCIETES as IS } from '../catalogue/is-societes.js';
import { CATALOGUE_TVA_MICRO as TVA } from '../catalogue/tva-micro.js';

const codeErreur = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurParametre ? e.code : 'autre';
  }
  return undefined;
};

describe('banc profil 2 : paramètres', () => {
  it('P19', () => {
    const fermee: ParametreLegal[] = TVA.map((l) => (l.cle === 'tva.taux.normal' ? { ...l, effet_fin: '2027-01-01' } : l));
    expect(parametreAuJour(fermee, 'tva.taux.normal', 'FR', '2026-12-31').cle).toBe('tva.taux.normal');
    expect(codeErreur(() => parametreAuJour(fermee, 'tva.taux.normal', 'FR', '2027-01-15'))).toBe('parametre_absent');
    expect(codeErreur(() => parametreAuJour([], 'tva.taux.normal', 'FR', '2027-01-15'))).toBe('parametre_absent');
  });

  it('P20', () => {
    const l = parametreAuJour(IS, 'micro_comptable.seuils', 'FR', '2026-11-06');
    expect(l.statut).toBe('a_verifier');
    expect(IS.find((x) => x.cle === l.cle)?.source_titre).toContain('D123-200');
    expect(l.date_releve).toBe('2026-11-06');
    expect(l.statut).not.toBe('valide');
  });

  it('P21', () => {
    const a = parametreAuJour(IS, 'tva.franchise.mention', 'FR', '2026-12-31');
    expect(a.valeur).toContain('293 B du CGI');
    for (const jour of ['2027-01-01', '2027-01-02']) {
      const b = parametreAuJour(IS, 'tva.franchise.mention', 'FR', jour);
      expect(b.valeur).toContain('CIBS');
      expect(b.valeur).not.toBe(a.valeur);
    }
  });
});
