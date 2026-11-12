import { describe, expect, it } from 'vitest';
import { type RegleIndice, detecterOperations } from '../operations.js';

// Table INVENTÉE pour les tests (libellés et comptes d'exemple).
const TABLE: RegleIndice[] = [
  { operation: 'cession_titres', libelles: ['cession de parts', 'cession d\'actions'], comptes: [] },
  { operation: 'capital', libelles: ['augmentation de capital'], comptes: ['101', ' '] },
  { operation: 'siege', libelles: ['transfert de siège'], comptes: [] },
  { operation: 'statuts', libelles: ['modification des statuts'], comptes: [] },
  { operation: 'dissolution', libelles: ['dissolution', ''], comptes: ['108'] },
];
const ban = (ref: string, libelle: string) => ({ source: 'banque' as const, ref, libelle });
const aucun = { indices: [], actes: [] };

describe('opérations juridiques détectées', () => {
  it('cession-de-parts-constat-bloquant-sans-acte', () => {
    const c = detecterOperations({ indices: [ban('vir-1', 'Cession de parts Société Exemple')], actes: [] }, TABLE);
    expect(c).toEqual([{ operation: 'cession_titres', gravite: 'bloquant', indices: ['vir-1'] }]);
    expect(detecterOperations(aucun, TABLE)).toEqual([]);
    expect(detecterOperations({ indices: [ban('v', 'Courses bureau')], actes: [] }, TABLE)).toEqual([]);
  });

  it('acte-depose-leve-le-constat', () => {
    const indices = [ban('vir-1', 'cession de parts'), ban('vir-2', 'transfert de siège')];
    const c = detecterOperations({ indices, actes: [{ operation: 'cession_titres', ref: 'acte-1' }] }, TABLE);
    expect(c.map((x) => x.operation)).toEqual(['siege']);
    // un acte d'une autre opération ne lève rien
    const d = detecterOperations({ indices, actes: [{ operation: 'capital', ref: 'acte-2' }] }, TABLE);
    expect(d.map((x) => x.operation)).toEqual(['cession_titres', 'siege']);
  });

  it('indices-banque-et-pieces', () => {
    const indices = [
      ban('vir-9', 'AUGMENTATION DE CAPITAL'),
      { source: 'piece' as const, ref: 'piece-3', libelle: 'Projet de dissolution' },
      { source: 'ecriture' as const, ref: 'ecr-4', compte: '1011' },
      { source: 'ecriture' as const, ref: 'ecr-5', compte: '455' },
      { source: 'ecriture' as const, ref: 'ecr-6', compte: '108000' },
      { source: 'ecriture' as const, ref: 'ecr-7', compte: '2108' },
      { source: 'ecriture' as const, ref: 'ecr-0', compte: '108000', libelle: 'Dissolution' },
      { source: 'ecriture' as const, ref: 'ecr-0', compte: '108000' },
    ];
    const c = detecterOperations({ indices, actes: [] }, TABLE);
    expect(c).toEqual([
      { operation: 'capital', gravite: 'bloquant', indices: ['ecr-4', 'vir-9'] },
      { operation: 'dissolution', gravite: 'bloquant', indices: ['ecr-0', 'ecr-6', 'piece-3'] },
    ]);
    // libellé vide dans la table : ne correspond à rien
    expect(detecterOperations({ indices: [ban('v', 'x'), { source: 'piece', ref: 'p' }], actes: [] }, TABLE)).toEqual([]);
  });
});
