import { describe, expect, it } from 'vitest';
import { libelleReverifier, refusEcart, titreRefus } from '../garde-fou.js';
import { textesTva, type ValeursTva } from '../tva.js';

const IDS = [
  ...Array.from({ length: 20 }, (_, i) => `CC-T${String(i + 1).padStart(2, '0')}`),
  'CC-T03A', 'CC-T12M', 'CC-T18M',
];
const V: ValeursTva = { montant: '140,00 €', seuil: '37 500 €', mois: "octobre", nom: 'Garage Fontaine', pays: 'aux États-Unis', nombre: '2', aVerifier: false };
const toutes = (v: ValeursTva = V): string[] => Object.values(textesTva).map((f) => f(v));
const INTERDITS = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join(''));

describe('textes de TVA et garde-fou', () => {
  it('une-phrase-par-controle-tva', () => {
    expect([...Object.keys(textesTva)].sort()).toEqual([...IDS].sort());
    expect(new Set(toutes()).size).toBe(IDS.length);
    for (const p of [...toutes(), refusEcart, titreRefus(2)]) {
      expect(p).toMatch(/[.]$/);
      expect(p).not.toMatch(/\s{2}|undefined/);
    }
  });

  it('a-verifier-annonce', () => {
    const v = { ...V, montant: '34 000 €', aVerifier: true };
    expect(textesTva['CC-T12']?.(v)).toContain('(34 000 € sur 37 500 €, à vérifier)');
    expect(textesTva['CC-T12']?.({ ...v, aVerifier: false })).toContain('(34 000 € sur 37 500 €)');
    for (const id of ['CC-T12M', 'CC-T18', 'CC-T18M']) {
      expect(textesTva[id]?.(v)).toContain(', à vérifier)');
      expect(textesTva[id]?.({ ...v, aVerifier: false })).not.toContain('vérifier');
    }
  });

  it('texte-cc-t20-expert', () => {
    const t = textesTva['CC-T20']?.(V) ?? '';
    expect(t).toContain('octobre');
    expect(t).toContain("l'expert");
    expect(t).toContain('suspendue');
    expect(t).not.toMatch(/\d/);
  });

  it('garde-fou-pluriel', () => {
    expect(titreRefus(1)).toBe('Cette action attend la correction de 1 point bloquant.');
    expect(titreRefus(2)).toBe('Cette action attend la correction de 2 points bloquants.');
    for (const n of [0, -1, 1.5, NaN, Infinity]) expect(() => titreRefus(n)).toThrow(RangeError);
    expect(refusEcart).toBe('Ce contrôle ne peut pas être écarté : la donnée doit être corrigée.');
    expect(libelleReverifier).toBe('Revérifier');
  });

  it('vouvoiement', () => {
    for (const p of [...toutes(), refusEcart, titreRefus(3)]) expect(p).not.toMatch(/(?<!\p{L})(tu|ton|ta|tes|toi|te)(?!\p{L})/iu);
    expect(textesTva['CC-T01']?.(V)).toContain('Choisissez-la');
    expect(textesTva['CC-T03']?.(V)).toContain('Relisez-la');
  });

  it('mots-interdits-absents', () => {
    const tout = [...toutes(), ...toutes({ ...V, aVerifier: true }), refusEcart, titreRefus(1), libelleReverifier].join(' ').toLowerCase();
    for (const m of INTERDITS) expect(tout).not.toContain(m.toLowerCase());
    expect(INTERDITS).toHaveLength(5);
  });

  it('valeurs-inserees', () => {
    expect(textesTva['CC-T02']?.(V)).toBe(
      '2 factures ont une TVA à trancher (TVA en jeu : 140,00 €). La déclaration de la période octobre sera préparée quand elles le seront.',
    );
    expect(textesTva['CC-T09']?.(V)).toBe(
      "Cet achat aux États-Unis n'est pas encore pris en charge : la TVA du mois ne peut pas être préparée tant qu'il reste dans la période.",
    );
    expect(textesTva['CC-T04']?.(V)).toContain('Garage Fontaine');
    expect(textesTva['CC-T10']?.(V)).toContain('aux États-Unis');
  });

  it('aucun-montant-calcule', () => {
    const v: ValeursTva = { montant: 'M', seuil: 'S', mois: 'O', nom: 'N', pays: 'P', nombre: 'X', aVerifier: false };
    for (const f of Object.values(textesTva)) {
      expect(f(v).replace(/[MSONPX]/g, '')).not.toMatch(/\d/);
      expect(f.length).toBeLessThanOrEqual(1);
    }
    expect(textesTva['CC-T06']?.({ ...v, montant: '1,5' })).toContain('(1,5)');
  });
});
