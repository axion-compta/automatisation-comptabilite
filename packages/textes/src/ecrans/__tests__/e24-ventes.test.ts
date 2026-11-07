import { describe, expect, it } from 'vitest';
import { e24Vente } from '../e24-vente.js';
import { e24Ventes } from '../e24-ventes.js';

const ETATS = ['a_relire', 'proposee', 'a_encaisser', 'payee_en_partie', 'en_retard', 'payee', 'en_litige', 'doublon'];
// Assemblés ici pour ne pas figurer en clair dans le dépôt.
const INTERDITS = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP'], ['re', 'lance'], ['let', 'trage']].map((p) => p.join(''));

function feuilles(o: unknown, chemin: string): Array<[string, string]> {
  if (typeof o === 'string') return [[chemin, o]];
  if (typeof o !== 'object' || o === null) throw new Error(`${chemin} : texte attendu`);
  return Object.entries(o).flatMap(([k, v]) => feuilles(v, `${chemin}.${k}`));
}
const textes = [...feuilles(e24Ventes, 'ventes'), ...feuilles(e24Vente, 'vente')];

describe('textes E24 ventes', () => {
  it('huit-etats-ont-un-mot', () => {
    expect(Object.keys(e24Ventes.etats)).toEqual(ETATS);
    for (const e of ETATS) {
      const mot = (e24Ventes.etats as Record<string, string>)[e] ?? '';
      expect(mot.trim().length, e).toBeGreaterThan(0);
      expect(mot.split(/\s+/).length, e).toBeLessThanOrEqual(3);
    }
    expect(Object.values(e24Ventes.etats)).toContain('À relire');
    expect(new Set(Object.values(e24Ventes.etats)).size).toBe(8);
  });

  it('chaque-etat-a-son-action-ou-aucune', () => {
    const actions = e24Ventes.actions as Record<string, string>;
    expect(Object.keys(actions).sort()).toEqual(ETATS.filter((e) => e !== 'en_litige').sort());
    expect(actions['en_litige']).toBeUndefined();
    expect(actions['en_retard']).toBe('Voir le reste dû');
    expect(actions['payee_en_partie']).toBe('Voir le reste dû');
    expect(actions['a_relire']).toBe('Relire la facture');
    expect(actions['doublon']).toBe("Voir l'original");
    for (const [k, v] of Object.entries(actions)) expect(v.trim().length, k).toBeGreaterThan(0);
  });

  it('vouvoiement', () => {
    const tutoiement = /(?<![\p{L}\p{N}_])(tu|ton|ta|tes|toi|te)(?![\p{L}\p{N}_])/iu;
    for (const [c, t] of textes) expect(tutoiement.test(t), `${c} : ${t}`).toBe(false);
    expect(tutoiement.test('Tu peux')).toBe(true);
    expect(e24Ventes.profilIncomplet.startsWith('Votre')).toBe(true);
  });

  it('mots-interdits-absents', () => {
    expect(INTERDITS).toHaveLength(7);
    for (const [c, t] of textes) {
      for (const mot of INTERDITS) expect(t.toLowerCase().includes(mot.toLowerCase()), `${c} : ${mot}`).toBe(false);
    }
    expect(textes.some(([, t]) => /Dupont/i.test(t))).toBe(false);
  });

  it('parametres-de-gabarit-coherents', () => {
    const params = (t: string): string[] => [...t.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1] ?? '');
    expect(params(e24Ventes.enRetard)).toEqual(['jours']);
    expect(params(e24Ventes.avoirLie)).toEqual(['montant']);
    for (const [c, t] of textes) {
      if (c !== 'ventes.enRetard' && c !== 'ventes.avoirLie') expect(params(t), c).toEqual([]);
      expect(t.replace(/\{[^{}]*\}/g, '').includes('{') || t.replace(/\{[^{}]*\}/g, '').includes('}'), c).toBe(false);
    }
  });

  it('aucun-montant-en-dur', () => {
    for (const [c, t] of textes) {
      expect(/\d/.test(t), `${c} : ${t}`).toBe(false);
      expect(/[€$£]|\beuros?\b/i.test(t), `${c} : ${t}`).toBe(false);
    }
  });
});
