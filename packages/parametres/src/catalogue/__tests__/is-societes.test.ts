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

// Table écrite à la main, recopiée de la fiche L09-T27 (et non du code) : [clé, valeur, début, fin, statut, URL].
const F = 'https://entreprendre.service-public.gouv.fr/vosdroits/';
const L = 'https://www.legifrance.gouv.fr/codes/article_lc/';
const NV = 'non_verifie';
const AV = 'a_verifier';
const ATTENDU: [string, string, string, string | null, string, string][] = [
  ['is.taux.normal', '2500', '2022-12-31', null, NV, F + 'F23575'],
  ['is.taux.reduit', '1500', '2022-12-31', null, NV, F + 'F23575'],
  ['is.plafond_benefice_reduit', '4250000', '2022-12-31', null, NV, F + 'F23575'],
  ['is.taux_reduit.ca_max', '1000000000', '2022-12-31', null, NV, F + 'F23575'],
  ['is.taux_reduit.detention_pp', '7500', '2022-12-31', null, NV, F + 'F23575'],
  ['is.plafond.prorata', '{"regle":"par_periode_d_imposition","a_verifier":true}', '2026-01-01', null, AV, 'https://bofip.impots.gouv.fr/bofip/2065-PGP.html/identifiant=BOI-IS-LIQ-20-20-20230621'],
  ['micro_comptable.seuils', '{"bilan":45000000,"ca":90000000,"effectif":10,"criteres":2}', '2024-01-01', null, AV, L + 'LEGIARTI000049216681'],
  ['cac.seuils', '{"bilan":500000000,"ca":1000000000,"effectif":50,"criteres":2}', '2024-01-01', null, AV, L + 'LEGIARTI000049216674'],
  ['recouvrement.indemnite', '4000', '2026-01-01', null, AV, F + 'F31808'],
  ['facture_electronique.emission.pme_micro', '2027-09-01', '2026-01-01', null, AV, 'https://www.economie.gouv.fr/'],
  ['facture_electronique.reception', '2026-09-01', '2026-01-01', null, AV, 'https://www.economie.gouv.fr/'],
  ['references.cibs', 'articles du CIBS remplaçant les articles du CGI (269, 293 B, 289 bis, etc.)', '2027-01-01', null, AV, 'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069577'],
  ['tva.franchise.mention', 'TVA non applicable, art. 293 B du CGI', '2026-01-01', '2027-01-01', AV, F + 'F21746'],
  ['tva.franchise.mention_toleree', 'TVA non applicable, art. 293 B du CGI', '2027-01-01', '2028-07-01', AV, F + 'F21746'],
  ['tva.franchise.mention', 'TVA non applicable, article L. 233-3 du CIBS', '2027-01-01', null, AV, L + 'LEGIARTI000054524584/2027-01-01'],
];

describe('catalogue is-societes', () => {
  it('table-recopiee-de-la-fiche', () => {
    expect(C).toHaveLength(ATTENDU.length);
    expect(C.filter((l) => l.source_maj !== null).map((l) => l.cle)).toEqual(['is.taux.normal', 'recouvrement.indemnite']);
    ATTENDU.forEach(([cle, valeur, debut, fin, statut, url], i) => {
      const l = C[i]!;
      expect([l.cle, l.effet_debut, l.effet_fin, l.statut, l.source_url]).toEqual([cle, debut, fin, statut, url]);
      const brut = l.valeur.startsWith('{') ? JSON.stringify(JSON.parse(l.valeur)) : l.valeur;
      expect(brut).toBe(valeur);
    });
  });

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
        'tva.franchise.mention_toleree',
      ].sort(),
    );
    expect(C.filter((l) => l.cle === 'tva.franchise.mention')).toHaveLength(2);
    expect(C).toHaveLength(15);
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

  it('mention-toleree-fin-datee-exclue', () => {
    const t = (d: string) => parametreAuJour(C, 'tva.franchise.mention_toleree', 'FR', d);
    expect(t('2027-01-01').valeur).toContain('CGI');
    expect(t('2027-01-01').statut).toBe('a_verifier');
    expect(t('2028-06-30').valeur).toContain('CGI');
    expect(() => t('2028-07-01')).toThrow();
    expect(() => t('2026-12-31')).toThrow();
    expect(ligne('tva.franchise.mention_toleree').valeur).toBe(C.find((l) => l.cle === 'tva.franchise.mention' && l.effet_fin !== null)!.valeur);
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
      expect(s).toEqual(JSON.parse(ATTENDU.find((a) => a[0] === cle)![1]));
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
    expect(Number(ligne('is.taux_reduit.detention_pp').valeur)).toBe(7500);
    expect(ligne('recouvrement.indemnite').valeur).toMatch(/^[0-9]+$/);
  });
});
