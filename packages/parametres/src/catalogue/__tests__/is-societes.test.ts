import { describe, expect, it } from 'vitest';
import { parametreAuJour } from '../../au-jour.js';
import { verifierFrontieres } from '../../frontieres.js';
import { verifierCatalogue } from '../../source.js';
import { CATALOGUE_IS_SOCIETES as C } from '../is-societes.js';

const ligne = (cle: string) => {
  const l = C.find((x) => x.cle === cle);
  if (l === undefined) throw new Error(cle);
  return l;
};
const json = (cle: string) => JSON.parse(ligne(cle).valeur) as Record<string, unknown>;

describe('catalogue is-societes', () => {
  it('cles-attendues', () => {
    const cles = [...new Set(C.map((l) => l.cle))].sort();
    expect(cles).toEqual(
      [
        'is.taux.normal',
        'is.taux.reduit',
        'is.plafond_benefice_reduit',
        'is.taux_reduit.ca_max',
        'is.taux_reduit.detention_pp',
        'is.plafond.prorata',
        'micro_comptable.seuils',
        'cac.seuils',
        'recouvrement.indemnite',
        'facture_electronique.emission.pme_micro',
        'facture_electronique.reception',
        'references.cibs',
        'tva.franchise.mention',
      ].sort(),
    );
    expect(C.filter((l) => l.cle === 'tva.franchise.mention')).toHaveLength(2);
    expect(C).toHaveLength(14);
  });

  it('aucune-ligne-valide', () => {
    for (const l of C) expect(['non_verifie', 'a_verifier']).toContain(l.statut);
    expect(ligne('is.taux.normal').statut).toBe('non_verifie');
    expect(ligne('recouvrement.indemnite').statut).toBe('a_verifier');
  });

  it('chaque-ligne-a-sa-source-officielle', () => {
    expect(verifierCatalogue(C)).toEqual([]);
    for (const l of C) {
      expect(l.source.trim()).not.toBe('');
      expect(l.source_titre.trim()).not.toBe('');
      expect(l.date_releve).toBe('2026-11-06');
      expect(l.pays).toBe('FR');
    }
  });

  it('frontieres-sans-ecart', () => {
    expect(verifierFrontieres(C, 'FR')).toEqual([]);
  });

  it('mention-par-date-p21', () => {
    const a = parametreAuJour(C, 'tva.franchise.mention', 'FR', '2026-12-31');
    expect(a.valeur).toContain('CGI');
    for (const d of ['2027-01-01', '2027-01-02']) {
      const b = parametreAuJour(C, 'tva.franchise.mention', 'FR', d);
      const titre = C.find((x) => x.valeur === b.valeur)?.source_titre ?? '';
      expect(b.valeur).toContain('CIBS');
      expect(b.statut).toBe('a_verifier');
      expect(titre).toContain('L. 233-3');
      expect(titre).toContain('L. 223-3');
    }
    expect(a.effet_fin).toBe('2027-01-01');
  });

  it('plafond-prorata-sans-montant', () => {
    const l = ligne('is.plafond.prorata');
    expect(json('is.plafond.prorata')).toEqual({ regle: 'par_periode_d_imposition', a_verifier: true });
    expect(l.valeur).not.toMatch(/\d/);
    expect(l.statut).toBe('a_verifier');
    expect(C.filter((x) => x.cle === l.cle)).toHaveLength(1);
  });

  it('seuils-json-valides', () => {
    for (const cle of ['micro_comptable.seuils', 'cac.seuils']) {
      const s = json(cle);
      expect(Object.keys(s).sort()).toEqual(['bilan', 'ca', 'criteres', 'effectif']);
      for (const v of Object.values(s)) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v as number).toBeGreaterThan(0);
      }
      expect(s.criteres as number).toBeGreaterThanOrEqual(1);
      expect(s.criteres as number).toBeLessThanOrEqual(3);
    }
  });

  it('detention-en-points-de-base', () => {
    for (const cle of ['is.taux.normal', 'is.taux.reduit', 'is.taux_reduit.detention_pp']) {
      expect(ligne(cle).valeur).toMatch(/^[0-9]+$/);
      expect(Number(ligne(cle).valeur)).toBeLessThanOrEqual(10000);
    }
    expect(Number(ligne('is.taux_reduit.detention_pp').valeur)).toBeGreaterThan(100);
    expect(ligne('recouvrement.indemnite').valeur).toMatch(/^[0-9]+$/);
  });
});
