import { describe, expect, it } from 'vitest';
import { executerControles, type RegleControle, type TraceControle } from '../../controles/moteur.js';
import { reglesVentesA } from '../../controles/regles/ventes-a.js';
import { reglesVentesB } from '../../controles/regles/ventes-b.js';
import { CODES, injecter, jeuSain } from './banc-anomalies-donnees.js';

const REGLES = [...reglesVentesA, ...reglesVentesB] as unknown as RegleControle<unknown>[];
const ATTENDU = ['CC-V01', 'CC-V02', 'CC-V03', 'CC-V04', 'CC-V05', 'CC-V06', 'CC-V07', 'CC-V08', 'CC-V09', 'CC-V10', 'CC-V11', 'CC-V12', 'CC-V13', 'CC-V14', 'CC-V15', 'CC-V16', 'CC-V17', 'CC-V18', 'CC-V19', 'CC-V20'];

function lancer(jeu: Record<string, unknown>): TraceControle[] {
  return REGLES.flatMap((r) => executerControles([r], [{ type: 'vente', id: r.id, donnee: jeu[r.id] }], 'avant_export', '2026-11-07T00:00:00Z'));
}

describe('banc des 20 anomalies de vente (VEN-021)', () => {
  it('le banc couvre exactement les règles CC-V01 à CC-V20, une trace par règle', () => {
    expect(CODES).toEqual(ATTENDU);
    expect(REGLES.map((r) => r.id)).toEqual(ATTENDU);
    expect(lancer(jeuSain())).toHaveLength(20);
  });

  it('jeu-sain-aucune-alerte : aucune trace ALERTE ni IMPOSSIBLE', () => {
    const mauvaises = lancer(jeuSain()).filter((t) => t.resultat === 'ALERTE' || t.resultat === 'IMPOSSIBLE');
    expect(mauvaises).toEqual([]);
  });

  it('banc-20-sur-20 : chaque règle attendue rend ALERTE sur son anomalie', () => {
    const detectees = ATTENDU.filter((code) => lancer(injecter(code)).find((t) => t.regleId === code)?.resultat === 'ALERTE');
    console.log(`anomalies détectées : ${detectees.length} sur ${ATTENDU.length}`);
    expect(ATTENDU.filter((code) => !detectees.includes(code))).toEqual([]);
    expect(detectees).toHaveLength(20);
  });

  it('une-anomalie-n-en-declenche-pas-d-autre-bloquante : aucune autre règle de gravité B en ALERTE', () => {
    const graveB = new Set(REGLES.filter((r) => r.gravite === 'B').map((r) => r.id));
    expect([...graveB].sort()).toEqual(['CC-V03', 'CC-V16', 'CC-V19']);
    for (const code of ATTENDU) {
      const autres = lancer(injecter(code)).filter((t) => t.regleId !== code && graveB.has(t.regleId) && t.resultat === 'ALERTE');
      expect(autres, code).toEqual([]);
    }
  });

  it('injecter ne modifie pas le jeu sain et refuse un code inconnu', () => {
    injecter('CC-V01');
    expect(lancer(jeuSain()).every((t) => t.resultat === 'OK')).toBe(true);
    expect(() => injecter('CC-V21')).toThrow();
  });
});
