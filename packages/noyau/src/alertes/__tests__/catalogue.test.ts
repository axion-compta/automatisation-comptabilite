import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOGUE_MVP, ENTREES_MENU } from '../catalogue.js';

const DOSSIER_REGLES = new URL('../regles/__tests__/', import.meta.url);
const CODES = Array.from({ length: CATALOGUE_MVP.length }, (_, i) => `ALR-${String(i + 1).padStart(2, '0')}`);
const NATURES: Record<string, string> = {
  'ALR-01': 'echeance_legale', 'ALR-04': 'echeance_legale', 'ALR-08': 'autre', 'ALR-09': 'argent',
  'ALR-05': 'blocage', 'ALR-06': 'blocage', 'ALR-07': 'blocage',
};
// Noms de test (équivalents déclarés) : se déclenche / ne se déclenche pas / seuil exact.
const TROIS_CAS: Record<string, readonly [string, string, string]> = {
  'ALR-01': ['alr01-se-declenche', 'alr01-ne-se-declenche-pas', 'alr01-seuil-exact'],
  'ALR-02': ['alr02-se-declenche', 'alr02-ne-se-declenche-pas', 'alr02-seuil-exact'],
  'ALR-03': ['alr03-se-declenche', 'alr03-ne-se-declenche-pas', 'alr03-seuil-exact'],
  'ALR-04': ['alr04-se-declenche', 'alr04-ne-se-declenche-pas', 'alr04-seuil-exact'],
  'ALR-05': ['alr05-a-faire-hors-tva', 'alr05-lecture-sure-rien', 'alr05-bloquant-si-periode-tva'],
  'ALR-06': ['alr06-toujours-bloquant', 'alr06-taux-et-nature-connus-rien', 'alr06-un-seul-manquant-suffit'],
  'ALR-07': ['alr07-vrai-bloquant', 'alr07-faux-rien', 'alr07-absent-rien'],
  'ALR-08': ['alr08-se-declenche', 'alr08-echeance-du-jour-rien', 'alr08-echeance-du-jour-rien'],
  'ALR-09': ['alr09-se-declenche', 'alr09-ne-se-declenche-pas', 'alr09-seuil-exact'],
  'ALR-10': ['alr10-ecart-a-faire', 'alr10-ok-rien', 'alr10-impossible-urgent'],
  'ALR-11': ['alr11-cabinet-non-lu', 'alr11-lu-rien', 'alr11-client-rien'],
};

describe('catalogue MVP des alertes', () => {
  it('onze-regles-mvp', () => {
    expect(CATALOGUE_MVP).toHaveLength(Object.keys(TROIS_CAS).length);
    expect(Object.isFrozen(CATALOGUE_MVP)).toBe(true);
    for (const r of CATALOGUE_MVP) {
      expect(r.perimetre).toBe('MVP');
      expect(r.actif).toBe(true);
      expect(Number.isSafeInteger(r.version) && r.version > 0).toBe(true);
      expect(typeof r.evaluer).toBe('function');
      expect(Object.isFrozen(r)).toBe(true);
    }
  });

  it('codes-uniques-et-ordonnes', () => {
    expect(CATALOGUE_MVP.map((r) => r.code)).toEqual(CODES);
    expect(new Set(CATALOGUE_MVP.map((r) => r.code)).size).toBe(CATALOGUE_MVP.length);
    expect(new Set(CATALOGUE_MVP.map((r) => r.evaluer)).size).toBe(CATALOGUE_MVP.length);
  });

  it('toutes-ont-une-action-principale', () => {
    for (const r of CATALOGUE_MVP) {
      expect(r.actionPrincipale).not.toBe('');
      expect(r.actionPrincipale).toMatch(/^[a-z_]+$/);
    }
  });

  it('entree-menu-connue', () => {
    expect([...ENTREES_MENU]).toEqual(['activite', 'mois', 'banque', 'factures', 'declarations', 'documents']);
    for (const r of CATALOGUE_MVP) expect(ENTREES_MENU).toContain(r.entreeMenu);
  });

  it('nature-coherente', () => {
    for (const r of CATALOGUE_MVP) {
      if (NATURES[r.code] !== undefined) expect(r.nature).toBe(NATURES[r.code]);
      expect(['echeance_legale', 'argent', 'blocage', 'autre']).toContain(r.nature);
      expect(['info', 'a_faire', 'urgent', 'bloquant']).toContain(r.graviteBase);
    }
  });

  it('trois-cas-par-regle', () => {
    const noms = new Set<string>();
    for (const f of readdirSync(DOSSIER_REGLES).filter((x) => x.endsWith('.test.ts'))) {
      for (const m of readFileSync(new URL(f, DOSSIER_REGLES), 'utf8').matchAll(/\bit\(\s*'([^']+)'/g)) noms.add(m[1] ?? '');
    }
    expect(Object.keys(TROIS_CAS)).toEqual(CODES);
    for (const r of CATALOGUE_MVP) for (const nom of TROIS_CAS[r.code] ?? ['absent']) expect(noms, `${r.code} ${nom}`).toContain(nom);
  });
});
