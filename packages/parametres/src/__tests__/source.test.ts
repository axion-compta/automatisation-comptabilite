import { describe, expect, it } from 'vitest';
import { DOMAINES_OFFICIELS, ParametreSource, domaineOfficiel, verifierCatalogue } from '../source.js';

const ligne = {
  cle: 'cle_exemple',
  pays: 'FR',
  valeur: 'x',
  effet_debut: '2026-01-01',
  effet_fin: null,
  statut: 'a_verifier',
  source: 'Texte inventé',
  date_releve: '2026-06-01',
  source_url: 'https://www.legifrance.gouv.fr/exemple',
  source_titre: 'Titre inventé',
  source_maj: '2026-05-01',
};

const AROBASE = String.fromCharCode(64);
describe('source officielle', () => {
  it('domaine-exact-permis', () => {
    for (const d of DOMAINES_OFFICIELS) expect(domaineOfficiel(`https://${d}/page`), d).toBe(true);
    expect(domaineOfficiel('https://LEGIFRANCE.GOUV.FR/x')).toBe(true);
  });
  it('sous-domaine-permis', () => {
    expect(domaineOfficiel('https://www.legifrance.gouv.fr/x')).toBe(true);
    expect(domaineOfficiel('https://a.b.economie.gouv.fr')).toBe(true);
  });
  it('domaine-trompeur-refuse', () => {
    for (const u of [
      'https://legifrance.gouv.fr.exemple.com/x',
      'https://exemplelegifrance.gouv.fr/x',
      'https://legifrance.gouv.fr' + AROBASE + 'exemple.com/x',
      'https://legifrance.gouv.fr:mdp' + AROBASE + 'legifrance.gouv.fr/x',
      'https://exemple.com/legifrance.gouv.fr',
      'https://gouv.fr/x',
    ])
      expect(domaineOfficiel(u), u).toBe(false);
    expect(domaineOfficiel(undefined)).toBe(false);
  });
  it('http-refuse', () => {
    expect(domaineOfficiel('http://legifrance.gouv.fr/x')).toBe(false);
    expect(domaineOfficiel('ftp://legifrance.gouv.fr/x')).toBe(false);
  });
  it('url-mal-formee', () => {
    for (const u of ['', 'legifrance.gouv.fr', 'javascript:alert(1)', 'https://']) expect(domaineOfficiel(u), u).toBe(false);
  });
  it('titre-vide-refuse', () => {
    expect(ParametreSource.safeParse(ligne).success).toBe(true);
    expect(ParametreSource.safeParse({ ...ligne, source_titre: '' }).success).toBe(false);
    expect(ParametreSource.safeParse({ ...ligne, source_url: 'https://exemple.com' }).success).toBe(false);
  });
  it('releve-avant-maj-refuse', () => {
    expect(ParametreSource.safeParse({ ...ligne, source_maj: '2026-06-02' }).success).toBe(false);
    expect(ParametreSource.safeParse({ ...ligne, source_maj: '2026-06-01' }).success).toBe(true);
    expect(ParametreSource.safeParse({ ...ligne, source_maj: null }).success).toBe(true);
    expect(ParametreSource.safeParse({ ...ligne, source_maj: '1/6/2026' }).success).toBe(false);
  });
  it('catalogue-erreurs-par-cle', () => {
    expect(verifierCatalogue([])).toEqual([]);
    expect(verifierCatalogue([ligne])).toEqual([]);
    const r = verifierCatalogue([
      ligne,
      { ...ligne, cle: 'cle_b', source_url: 'http://legifrance.gouv.fr' },
      { ...ligne, cle: 'cle_c', source_maj: '2026-07-01' },
      null,
    ]);
    expect(r.slice(0, 2).map((e) => e.cle)).toEqual(['cle_b', 'cle_c']);
    expect(r.slice(2).every((e) => e.cle === '(sans cle)')).toBe(true);
    expect(r[0]?.motif).toContain('url non officielle');
    expect(r[1]?.motif).toContain('releve avant maj');
    expect(r.length).toBeGreaterThanOrEqual(3);
  });
  it('liste-figee', () => {
    expect([...DOMAINES_OFFICIELS]).toEqual([
      'legifrance.gouv.fr',
      'bofip.impots.gouv.fr',
      'impots.gouv.fr',
      'entreprendre.service-public.gouv.fr',
      'economie.gouv.fr',
    ]);
  });
});
