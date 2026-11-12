import { describe, expect, it } from 'vitest';
import { CATALOGUE_IS_SOCIETES } from '../catalogue/is-societes.js';
import { MATRICE_FORMES, PERIMETRE } from '../catalogue/formes-perimetre.js';
import { CATALOGUE_TVA_MICRO } from '../catalogue/tva-micro.js';
import {
  alertesConsultation,
  REGISTRE_SOURCES,
  verifierEntree,
  type EntreeSource,
} from '../registre-sources.js';

const BASE: EntreeSource = {
  nom: 'Source fictive',
  url: 'https://www.legifrance.gouv.fr/exemple',
  consultation: '2026-01-01',
  version: 'v1',
  licence: 'a_confirmer',
  quota: 'a_confirmer',
  proprietaire: 'Éditeur fictif',
  statut: 'non_verifie',
};
const avec = (c: object) => ({ ...BASE, ...c });
const SEUIL = 90;

describe('registre-sources', () => {
  it('entree-complete-acceptee', () => {
    expect(verifierEntree(BASE)).toEqual([]);
    for (const statut of ['verifie', 'partiel', 'non_verifie']) {
      expect(verifierEntree(avec({ statut }))).toEqual([]);
    }
  });
  it('licence-quota-proprietaire-obligatoires', () => {
    for (const champ of ['licence', 'quota', 'proprietaire', 'nom', 'url', 'version']) {
      for (const v of ['', '   ', undefined, null, 0]) {
        expect(verifierEntree(avec({ [champ]: v }))).toContain('champ_vide');
      }
    }
    for (const e of REGISTRE_SOURCES) {
      expect(e.licence.trim()).not.toBe('');
      expect(e.quota.trim()).not.toBe('');
      expect(e.proprietaire.trim()).not.toBe('');
    }
  });
  it('statut-hors-liste-refuse', () => {
    for (const statut of ['valide', 'Verifie', '', undefined, 1]) {
      expect(verifierEntree(avec({ statut }))).toContain('statut_inconnu');
    }
    for (const consultation of ['2026-13-01', '2026-02-30', '01/01/2026', '', undefined, '2026-1-1']) {
      expect(verifierEntree(avec({ consultation }))).toContain('date_invalide');
    }
  });
  it('consultation-91-jours-alerte', () => {
    const reg = [avec({ consultation: '2026-01-01' })];
    // 2026-01-01 + 91 jours = 2026-04-02
    expect(alertesConsultation(reg, '2026-04-02', SEUIL)).toEqual(reg);
    expect(alertesConsultation(reg, '2027-01-01', SEUIL)).toEqual(reg);
    expect(alertesConsultation([avec({ consultation: 'x' })], '2026-04-02', SEUIL)).toHaveLength(1);
  });
  it('consultation-90-jours-sans-alerte', () => {
    const reg = [avec({ consultation: '2026-01-01' })];
    expect(alertesConsultation(reg, '2026-04-01', SEUIL)).toEqual([]);
    expect(alertesConsultation(reg, '2026-01-01', SEUIL)).toEqual([]);
    expect(alertesConsultation(reg, '2025-12-01', SEUIL)).toEqual([]);
    expect(alertesConsultation(reg, '2026-01-02', 0)).toEqual(reg);
    expect(alertesConsultation(reg, '2026-01-01', 0)).toEqual([]);
    expect(() => alertesConsultation(reg, '2026-04-01', -1)).toThrow();
    expect(() => alertesConsultation(reg, '2026-04-01', NaN)).toThrow();
    expect(() => alertesConsultation(reg, '2026-04-01', Infinity)).toThrow();
    expect(() => alertesConsultation(reg, '2026-04-01', -Infinity)).toThrow();
    expect(() => alertesConsultation(reg, 'x', SEUIL)).toThrow();
  });
  it('chaque-source-de-catalogue-a-son-entree', () => {
    const urls = new Set(
      [...CATALOGUE_IS_SOCIETES, ...CATALOGUE_TVA_MICRO].map((l) => l.source_url).filter((u) => u !== ''),
    );
    expect(urls.size).toBeGreaterThanOrEqual(13);
    // formes-perimetre n'a aucun source_url ; s'il en reçoit un, il doit entrer au registre.
    for (const l of [...MATRICE_FORMES, PERIMETRE]) {
      expect(JSON.stringify(l)).not.toContain('source_url');
    }
    const connues = new Set(REGISTRE_SOURCES.map((e) => e.url));
    for (const u of urls) expect(connues.has(u)).toBe(true);
    expect(connues.size).toBe(REGISTRE_SOURCES.length);
    for (const e of REGISTRE_SOURCES) expect(verifierEntree(e)).toEqual([]);
  });
});
