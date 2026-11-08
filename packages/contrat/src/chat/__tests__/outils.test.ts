import { describe, expect, it } from 'vitest';
import { CODES_ERREUR } from '../../../../noyau/src/chat/types.js';
import { registre } from '../../actions/index.js';
import outilsJson from '../outils.json' with { type: 'json' };
import { NOMS_OUTILS, schemaEntree, schemaSortie, validerEntree } from '../outils.js';

const ligne = { compte: '601000', debit_centimes: 100, credit_centimes: 0, devise: 'EUR' };
const valides: Record<string, unknown> = {
  'exercices.lister': {},
  'plan.lister': { exercice_id: 'ex_a1' },
  'tiers.lister': { recherche: 'Dupont' },
  'ecritures.lister': { exercice_id: 'ex_a1' },
  'vue.ouvrir': { vue: 'ecritures' },
  'change.expliquer_ecart': { ecart_id: 'ec_a1' },
  proposer_validation: { exercice_id: 'ex_a1', lignes: [ligne, { ...ligne, debit_centimes: 0, credit_centimes: 100 }] },
};
const nomsValides = Object.keys(valides);

describe('outils du chat', () => {
  it('chaque-nom-a-ses-schemas', () => {
    expect([...NOMS_OUTILS].sort()).toEqual([...nomsValides].sort());
    for (const nom of NOMS_OUTILS) {
      expect(schemaEntree(nom)).toBeDefined();
      expect(schemaSortie(nom)).toBeDefined();
      expect(validerEntree(nom, valides[nom])).toEqual({ ok: true, valeur: valides[nom] });
    }
    for (const o of outilsJson) {
      expect(o.permission).toMatch(/^compta-/);
      expect(o.exigences.length).toBeGreaterThan(0);
      expect(Array.isArray(o.codes_erreur)).toBe(true);
    }
  });
  it('aucun-outil-appliquer', () => {
    for (const nom of NOMS_OUTILS) expect(nom).not.toMatch(/appliquer/);
    for (const o of outilsJson) {
      expect(o.outil_registre).not.toMatch(/appliquer/);
      expect(o.niveau).not.toBe('I');
    }
    expect(validerEntree('appliquer', {})).toEqual({ ok: false, code: 'outil_hors_liste' });
  });
  it('champ-societe-refuse', () => {
    for (const nom of NOMS_OUTILS) {
      for (const champ of ['societe_id', 'tenant_id', 'societeId']) {
        expect(validerEntree(nom, { ...(valides[nom] as object), [champ]: 'x' })).toEqual({
          ok: false,
          code: 'parametre_invalide',
        });
      }
    }
  });
  it('parametre-en-trop-refuse', () => {
    for (const nom of NOMS_OUTILS) {
      expect(validerEntree(nom, { ...(valides[nom] as object), en_trop: 1 })).toEqual({
        ok: false,
        code: 'parametre_invalide',
      });
    }
    expect(validerEntree('proposer_validation', { ...(valides.proposer_validation as object), lignes: [{ ...ligne, en_trop: 1 }] }).ok).toBe(false);
    for (const brut of [null, undefined, 'x', [], 5]) expect(validerEntree('plan.lister', brut).ok).toBe(false);
  });
  it('montant-non-entier-refuse', () => {
    for (const m of [1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '10', null]) {
      const brut = { exercice_id: 'ex_a1', lignes: [{ ...ligne, debit_centimes: m }] };
      expect(validerEntree('proposer_validation', brut)).toEqual({ ok: false, code: 'parametre_invalide' });
      const brutCredit = { exercice_id: 'ex_a1', lignes: [{ ...ligne, credit_centimes: m }] };
      expect(validerEntree('proposer_validation', brutCredit).ok).toBe(false);
    }
  });
  it('devise-invalide-refusee', () => {
    for (const d of ['eur', 'EU', 'EURO', '', 'E1R', 42, undefined]) {
      const brut = { exercice_id: 'ex_a1', lignes: [{ ...ligne, devise: d }] };
      expect(validerEntree('proposer_validation', brut)).toEqual({ ok: false, code: 'parametre_invalide' });
    }
  });
  it('outil-inconnu-hors-liste', () => {
    for (const nom of ['inconnu', '', 'toString', '__proto__', 'constructor', 'vue.fermer']) {
      expect(validerEntree(nom, {})).toEqual({ ok: false, code: 'outil_hors_liste' });
      expect(schemaEntree(nom)).toBeUndefined();
    }
  });
  it('outil-registre-existe', () => {
    for (const o of outilsJson) {
      const r = registre.outils.find((x) => x.id === o.outil_registre);
      expect(r).toBeDefined();
      expect(r?.chat).toBe('ouvert');
      expect(r?.niveau).toBe(o.niveau);
    }
  });
  it('noms-uniques', () => {
    const noms = outilsJson.map((o) => o.nom);
    expect(new Set(noms).size).toBe(noms.length);
    expect(new Set(NOMS_OUTILS).size).toBe(NOMS_OUTILS.length);
  });
  it('codes-erreur-liste-fermee', () => {
    const connus: readonly string[] = CODES_ERREUR;
    for (const o of outilsJson) {
      expect(o.codes_erreur.length).toBeGreaterThan(0);
      expect(new Set(o.codes_erreur).size).toBe(o.codes_erreur.length);
      for (const c of o.codes_erreur) expect(connus).toContain(c);
    }
  });
});
