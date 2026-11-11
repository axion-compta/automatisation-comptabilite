import { describe, expect, it } from 'vitest';
import { CHAMPS_LIGNE, creerDepotUsage } from '../domaines/usage-base.js';

const JOUR = 86_400_000;
const T0 = Date.UTC(2026, 0, 15);
const SECRET_A = 'FICTIF-PAS-UN-SECRET-A-'.repeat(2);
const SECRET_B = 'FICTIF-PAS-UN-SECRET-B-'.repeat(2);

function fabrique(mois = 13) {
  let t = T0;
  const depot = creerDepotUsage({
    conservationMois: mois,
    maintenant: () => t,
    secretDe: (s) => ({ 'soc-a': SECRET_A, 'soc-b': SECRET_B })[s],
  });
  return { depot, avancer: (ms: number) => { t += ms; } };
}

describe('mesure d’usage stockée', () => {
  it('la ligne écrite ne contient que les champs de la liste', () => {
    const { depot } = fabrique();
    depot.ecrire('soc-a', 'personne-fictive-001', [
      { type: 'ecran_ouvert', ecran_code: 'bil', duree_ms: 1200, appareil: 'bureau', version_app: '1.2.3' },
    ]);
    const [ligne] = depot.lire('soc-a');
    expect(Object.keys(ligne as object).sort()).toEqual([...CHAMPS_LIGNE].sort());
    expect(JSON.stringify(ligne)).not.toContain('personne-fictive-001');
  });

  it('champ ou type hors liste : rejeté, rien n’est écrit', () => {
    const { depot } = fabrique();
    const n = depot.ecrire('soc-a', 'p1', [{ type: 'ecran_ouvert', contenu: 'x' }, { type: 'inconnu' }]);
    expect(n).toBe(0);
    expect(depot.compter('soc-a')).toBe(0);
  });

  it('secret propre au client : pseudonymes différents, jamais rendu', () => {
    const { depot } = fabrique();
    depot.ecrire('soc-a', 'p1', [{ type: 'palette_ouverte' }]);
    depot.ecrire('soc-b', 'p1', [{ type: 'palette_ouverte' }]);
    const a = depot.lire('soc-a')[0]?.pseudonyme;
    const b = depot.lire('soc-b')[0]?.pseudonyme;
    expect(a).not.toBe(b);
    const rendu = JSON.stringify([depot.lire('soc-a'), depot.lire('soc-b'), depot.statistiques('soc-a'), String(depot)]);
    expect(rendu).not.toContain(SECRET_A);
    expect(rendu).not.toContain(SECRET_B);
  });

  it('le secret n’est jamais journalisé et son absence refuse l’écriture', () => {
    const { depot } = fabrique();
    const sorties: string[] = [];
    const avant = [console.log, console.error, console.warn, console.info];
    console.log = console.error = console.warn = console.info = (...a: unknown[]) => { sorties.push(a.join(' ')); };
    try {
      depot.ecrire('soc-a', 'p1', [{ type: 'palette_ouverte' }]);
      expect(() => depot.ecrire('soc-z', 'p1', [{ type: 'palette_ouverte' }])).toThrow(/secret/);
    } finally {
      [console.log, console.error, console.warn, console.info] = avant as [typeof console.log, typeof console.error, typeof console.warn, typeof console.info];
    }
    expect(sorties.join('\n')).not.toContain('FICTIF-PAS-UN-SECRET');
  });

  it('conservation en paramètre : hors limites refusée', () => {
    expect(() => fabrique(0)).toThrow(RangeError);
    expect(() => fabrique(121)).toThrow(RangeError);
  });

  it('lignes au-delà de la conservation : marquées, jamais lues ni comptées', () => {
    const { depot, avancer } = fabrique(13);
    depot.ecrire('soc-a', 'p1', [{ type: 'ecran_ouvert', ecran_code: 'bil', duree_ms: 500 }]);
    avancer(300 * JOUR);
    depot.ecrire('soc-a', 'p1', [{ type: 'ecran_ouvert', ecran_code: 'bil', duree_ms: 900 }]);
    expect(depot.compter('soc-a')).toBe(2);
    avancer(120 * JOUR); // la première ligne a plus de 13 mois
    expect(depot.compter('soc-a')).toBe(1);
    expect(depot.lire('soc-a').map((l) => l.duree_ms)).toEqual([900]);
    expect(depot.statistiques('soc-a')[0]?.effectif).toBe(1);
    expect(depot.marquerEcheances('soc-a')).toBe(0);
  });

  it('marquerEcheances compte les lignes marquées sans rien supprimer', () => {
    const { depot, avancer } = fabrique(1);
    depot.ecrire('soc-a', 'p1', [{ type: 'palette_ouverte' }, { type: 'carte_ouverte' }]);
    avancer(40 * JOUR);
    expect(depot.marquerEcheances('soc-a')).toBe(2);
    expect(depot.marquerEcheances('soc-a')).toBe(0);
  });

  it('médiane et 90e centile par tâche sur les lignes non marquées', () => {
    const { depot, avancer } = fabrique(13);
    depot.ecrire('soc-a', 'p1', [{ type: 'ecran_ouvert', ecran_code: 'vieux', duree_ms: 99_000 }]);
    avancer(400 * JOUR);
    const durees = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    depot.ecrire('soc-a', 'p1', durees.map((d) => ({ type: 'ecran_ouvert', ecran_code: 'bil', duree_ms: d })));
    depot.ecrire('soc-a', 'p1', [{ type: 'ecran_ouvert', ecran_code: 'tva', duree_ms: 40 }, { type: 'palette_ouverte' }]);
    expect(depot.statistiques('soc-a')).toEqual([
      { tache: 'bil', effectif: 10, mediane_ms: 500, p90_ms: 900 },
      { tache: 'tva', effectif: 1, mediane_ms: 40, p90_ms: 40 },
    ]);
  });

  it('les sociétés restent séparées', () => {
    const { depot } = fabrique();
    depot.ecrire('soc-a', 'p1', [{ type: 'palette_ouverte' }]);
    expect(depot.lire('soc-b')).toEqual([]);
  });
});
