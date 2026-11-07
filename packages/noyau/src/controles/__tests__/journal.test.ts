import { describe, expect, it } from 'vitest';
import { ajouterAuJournal, dernierResultat, historiqueObjet, type LigneJournal } from '../journal.js';
import type { Declencheur, Resultat, TraceControle } from '../moteur.js';

const trace = (horodatage: string, declencheur: Declencheur, regleId: string, objetId: string, resultat: Resultat = 'OK', objetType = 'piece'): TraceControle => ({
  horodatage, declencheur, regleId, versionRegle: 1, objetType, objetId, resultat,
});

describe('journal de verification', () => {
  it('CT-40', () => {
    let j: readonly LigneJournal[] = [];
    j = ajouterAuJournal(j, [trace('2026-04-01T08:00:00Z', 'arrivee', 'CC-K01', 'p1')], 'v1');
    j = ajouterAuJournal(j, [trace('2026-04-02T02:00:00Z', 'nocturne', 'CC-K01', 'p1')], 'v1');
    j = ajouterAuJournal(j, [trace('2026-04-03T09:00:00Z', 'avant_export', 'CC-K01', 'p1')], 'v2');
    const h = historiqueObjet(j, 'piece', 'p1');
    expect(h.map((l) => l.declencheur)).toEqual(['arrivee', 'nocturne', 'avant_export']);
    expect(h.every((l) => l.resultat === 'OK')).toBe(true);
    expect(h.map((l) => l.versionParametres)).toEqual(['v1', 'v1', 'v2']);
    expect(h.map((l) => l.versionRegle)).toEqual([1, 1, 1]);
    expect(dernierResultat(j, 'CC-K01', 'p1')?.declencheur).toBe('avant_export');
    expect(dernierResultat(j, 'CC-K09', 'p1')).toBeUndefined();
    expect(dernierResultat(j, 'CC-K01', 'p2')).toBeUndefined();
  });

  it('journal-recu-inchange', () => {
    const base = ajouterAuJournal([], [trace('2026-04-01T08:00:00Z', 'arrivee', 'A', 'p1')], 'v1');
    const avant = JSON.stringify(base);
    const t = trace('2026-04-02T08:00:00Z', 'continu', 'A', 'p1', 'ALERTE');
    const suite = ajouterAuJournal(base, [t], 'v2');
    expect(suite).not.toBe(base);
    expect(base).toHaveLength(1);
    expect(suite).toHaveLength(2);
    expect(JSON.stringify(base)).toBe(avant);
    expect(Object.keys(t)).not.toContain('versionParametres');
    expect(suite[1]).toMatchObject({ resultat: 'ALERTE', versionParametres: 'v2' });
  });

  it('ligne-figee', () => {
    const j = ajouterAuJournal([], [trace('2026-04-01T08:00:00Z', 'arrivee', 'A', 'p1')], 'v1');
    expect(Object.isFrozen(j)).toBe(true);
    expect(Object.isFrozen(j[0])).toBe(true);
    const l = j[0] as { resultat: string };
    expect(() => {
      'use strict';
      l.resultat = 'OK2';
    }).toThrow(TypeError);
    expect(() => (j as LigneJournal[]).push(j[0] as LigneJournal)).toThrow(TypeError);
    const suite = ajouterAuJournal(j, [], 'v1');
    expect(Object.isFrozen(suite)).toBe(true);
    expect(suite).toHaveLength(1);
  });

  it('historique-trie', () => {
    const lignes = [
      trace('2026-04-02T00:00:00Z', 'nocturne', 'B', 'p1'),
      trace('2026-04-02T00:00:00Z', 'nocturne', 'A', 'p1'),
      trace('2026-04-01T00:00:00Z', 'arrivee', 'C', 'p1'),
    ];
    const attendu = ['C', 'A', 'B'];
    expect(historiqueObjet(ajouterAuJournal([], lignes, 'v1'), 'piece', 'p1').map((l) => l.regleId)).toEqual(attendu);
    expect(historiqueObjet(ajouterAuJournal([], [...lignes].reverse(), 'v1'), 'piece', 'p1').map((l) => l.regleId)).toEqual(attendu);
  });

  it('autre-objet-exclu', () => {
    const j = ajouterAuJournal([], [
      trace('2026-04-01T00:00:00Z', 'arrivee', 'A', 'p1'),
      trace('2026-04-01T00:00:00Z', 'arrivee', 'A', 'p2'),
      trace('2026-04-01T00:00:00Z', 'arrivee', 'A', 'p1', 'OK', 'ecriture'),
    ], 'v1');
    expect(historiqueObjet(j, 'piece', 'p1')).toHaveLength(1);
    expect(historiqueObjet(j, 'ecriture', 'p1')).toHaveLength(1);
    expect(historiqueObjet(j, 'piece', 'p3')).toEqual([]);
    expect(dernierResultat(j, 'A', 'p2')?.objetId).toBe('p2');
  });

  it('version-parametres-obligatoire', () => {
    for (const v of ['', '   ']) {
      expect(() => ajouterAuJournal([], [trace('2026-04-01T00:00:00Z', 'arrivee', 'A', 'p1')], v)).toThrow(
        expect.objectContaining({ code: 'version_parametres_absente' }),
      );
    }
    expect(ajouterAuJournal([], [], 'v1')).toEqual([]);
  });

  it('journal-vide', () => {
    expect(ajouterAuJournal([], [], 'v1')).toEqual([]);
    expect(historiqueObjet([], 'piece', 'p1')).toEqual([]);
    expect(dernierResultat([], 'A', 'p1')).toBeUndefined();
    const egaux = ajouterAuJournal([], [trace('2026-04-01T00:00:00Z', 'arrivee', 'A', 'p1'), trace('2026-04-01T00:00:00Z', 'continu', 'A', 'p1', 'ALERTE')], 'v1');
    expect(dernierResultat(egaux, 'A', 'p1')?.resultat).toBe('ALERTE');
    expect(dernierResultat([...egaux].reverse(), 'A', 'p1')?.resultat).toBe('OK');
  });
});
