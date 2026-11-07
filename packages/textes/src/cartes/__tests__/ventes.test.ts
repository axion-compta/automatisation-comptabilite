import { describe, expect, it } from 'vitest';
import { cartesVentes } from '../ventes.js';

const CODES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17', 'A18', 'A19', 'A20'];
const AUTRES = ['annee_close', 'a_declarer_periode_ouverte', 'regime_a_confirmer'];
// Assemblés ici pour ne pas figurer en clair dans le dépôt.
const INTERDITS = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP'], ['erreur de votre ', 'part']].map((p) => p.join(''));

const cartes = Object.entries(cartesVentes) as Array<[string, { titre: string; detail: string }]>;
const textes = cartes.flatMap(([c, v]) => [[`${c}.titre`, v.titre], [`${c}.detail`, v.detail]] as Array<[string, string]>);

describe('cartes des ventes', () => {
  it('vingt-anomalies-ont-un-texte', () => {
    expect(Object.keys(cartesVentes).sort()).toEqual([...CODES, ...AUTRES].sort());
    for (const [c, v] of cartes) {
      expect(v.titre.trim().length, c).toBeGreaterThan(0);
      expect(v.detail.trim().length, c).toBeGreaterThan(0);
      expect(v.titre, c).toBe(v.titre.trim());
      expect(v.detail, c).toBe(v.detail.trim());
    }
    expect(new Set(cartes.map(([, v]) => v.titre)).size).toBe(cartes.length);
    // Sens de chaque carte : un mot-clé attendu par code (spec 10, fiches L10-T27 et L10-T28).
    const MOTS: Record<string, RegExp> = {
      A1: /total/i, A3: /taux/i, A5: /deux factures/i, A9: /exercice/i, A10: /doublon/i, A11: /immatriculation/i,
      A12: /avoir/i, A13: /reste dû/i, A14: /acomptes/i, A15: /SIREN/, A17: /TVA/, A18: /créditeur/i, A19: /balance/i,
    };
    for (const [c, mot] of Object.entries(MOTS)) expect(`${cartesVentes[c as 'A1'].titre} ${cartesVentes[c as 'A1'].detail}`, c).toMatch(mot);
  });

  it('vouvoiement', () => {
    const tutoiement = /(?<![\p{L}\p{N}_])(tu|ton|ta|tes|toi|te)(?![\p{L}\p{N}_])/iu;
    for (const [c, t] of textes) expect(tutoiement.test(t), `${c} : ${t}`).toBe(false);
    expect(tutoiement.test('Tu peux')).toBe(true);
    expect(cartesVentes.A4.detail).toContain('déposez-la');
  });

  it('mots-interdits-absents', () => {
    expect(INTERDITS).toHaveLength(6);
    for (const [c, t] of textes) {
      for (const mot of INTERDITS) expect(t.toLowerCase().includes(mot.toLowerCase()), `${c} : ${mot}`).toBe(false);
    }
  });

  it('gabarits-connus-seulement', () => {
    const permis = ['numero', 'ecart', 'montant', 'date'];
    const utilises = new Set<string>();
    for (const [c, t] of textes) {
      for (const m of t.matchAll(/\{([^{}]*)\}/g)) {
        expect(permis, `${c} : ${m[0]}`).toContain(m[1]);
        utilises.add(m[1] ?? '');
      }
      expect(t.replace(/\{[^{}]*\}/g, '').match(/[{}]/), c).toBeNull();
      expect(/\d/.test(t), `${c} : aucun montant ni taux en dur`).toBe(false);
    }
    expect([...utilises].sort()).toEqual(['date', 'ecart', 'montant', 'numero']);
  });

  it('chaque-carte-dit-quoi-faire', () => {
    const action = /à vérifier|(?<![\p{L}])(déposez|indiquez|confirmez|vérifiez|choisissez|précisez|relisez|rattachez|dites)(?![\p{L}])/iu;
    for (const [c, v] of cartes) expect(action.test(v.detail), `${c} : ${v.detail}`).toBe(true);
    expect(action.test('Une facture existe')).toBe(false);
  });
});
