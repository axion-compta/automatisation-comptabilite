import { describe, expect, it } from 'vitest';
import { executerControles, type RegleControle, type Resultat } from '../moteur.js';

const H = '2026-01-15T10:00:00Z';

function regle(
  id: string,
  sortie: Resultat | (() => never),
  extra: Partial<RegleControle<number>> = {},
): RegleControle<number> {
  return {
    id,
    version: 1,
    gravite: 'M',
    bloque: [],
    declencheurs: ['arrivee'],
    actif: true,
    evaluer: () => {
      if (typeof sortie === 'function') return sortie();
      return { resultat: sortie };
    },
    ...extra,
  };
}

const objets = [
  { type: 'piece', id: 'P1', donnee: 1 },
  { type: 'piece', id: 'P2', donnee: 2 },
];

describe('moteur de contrôles', () => {
  it('ok-aussi-trace', () => {
    const t = executerControles([regle('R1', 'OK')], [objets[0]!], 'arrivee', H);
    expect(t).toHaveLength(1);
    expect(t[0]?.resultat).toBe('OK');
    expect(t[0]).toMatchObject({ horodatage: H, declencheur: 'arrivee', objetType: 'piece', objetId: 'P1' });
  });

  it('exception-donne-impossible', () => {
    const boum = regle('R1', () => {
      throw new Error('panne');
    });
    const t = executerControles([boum], [objets[0]!], 'arrivee', H);
    expect(t).toHaveLength(1);
    expect(t[0]?.resultat).toBe('IMPOSSIBLE');
    expect(t[0]?.resultat).not.toBe('OK');
  });

  it('regle-inactive-ignoree', () => {
    const t = executerControles([regle('R1', 'OK', { actif: false })], objets, 'arrivee', H);
    expect(t).toEqual([]);
    const tExport = executerControles([regle('R1', 'OK', { actif: false })], objets, 'avant_export', H);
    expect(tExport).toEqual([]);
  });

  it('hors-declencheur-ignoree', () => {
    const t = executerControles([regle('R1', 'OK')], objets, 'nocturne', H);
    expect(t).toEqual([]);
  });

  it('avant-export-tout-le-catalogue', () => {
    const regles = [
      regle('R1', 'OK', { declencheurs: ['arrivee'] }),
      regle('R2', 'ALERTE', { declencheurs: ['nocturne'] }),
      regle('R3', 'OK', { declencheurs: [] }),
    ];
    const t = executerControles(regles, [objets[0]!], 'avant_export', H);
    expect(t.map((x) => x.regleId)).toEqual(['R1', 'R2', 'R3']);
    expect(t.every((x) => x.declencheur === 'avant_export')).toBe(true);
  });

  it('une-trace-par-regle-et-objet', () => {
    const regles = [regle('R1', 'OK'), regle('R2', 'ALERTE')];
    const t = executerControles(regles, objets, 'arrivee', H);
    expect(t).toHaveLength(4);
    const couples = new Set(t.map((x) => x.regleId + '|' + x.objetId));
    expect(couples.size).toBe(4);
  });

  it('version-dans-la-trace', () => {
    const r = regle('R1', 'OK', { version: 7 });
    r.evaluer = () => ({ resultat: 'ALERTE', valeur: 'abc', ecartCentimes: 150 });
    const t = executerControles([r], [objets[0]!], 'arrivee', H);
    expect(t[0]?.versionRegle).toBe(7);
    expect(t[0]?.valeur).toBe('abc');
    expect(t[0]?.ecartCentimes).toBe(150);
    const sans = executerControles([regle('R2', 'OK')], [objets[0]!], 'arrivee', H);
    expect(sans[0]).not.toHaveProperty('valeur');
    expect(sans[0]).not.toHaveProperty('ecartCentimes');
  });
});
