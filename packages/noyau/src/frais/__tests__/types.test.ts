import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ErreurFrais,
  estStatutFinal,
  estStatutSortie,
  type CodeErreurFrais,
  type StatutFrais,
} from '../types.js';

const CODES: readonly CodeErreurFrais[] = [
  'frais_paye_societe',
  'justificatif_manquant',
  'bareme_a_verifier',
  'vehicule_societe',
  'deux_roues_non_pris_en_charge',
  'remboursement_superieur',
  'transition_interdite',
  'doublon_piece',
  'entree_invalide',
  'motif_obligatoire',
  'compte_courant_reserve_associes',
];
const STATUTS: readonly StatutFrais[] = [
  'brouillon',
  'a_completer',
  'propose',
  'valide',
  'rembourse',
  'en_compte_courant',
  'exclu_paye_societe',
  'refuse',
  'perso',
];
const SORTIES: readonly StatutFrais[] = ['exclu_paye_societe', 'refuse', 'perso'];
const FINALS: readonly StatutFrais[] = [...SORTIES, 'rembourse', 'en_compte_courant'];

describe('types frais', () => {
  it('codes-d-erreur-exhaustifs', () => {
    const texte = readFileSync(new URL('../types.ts', import.meta.url), 'utf8');
    const bloc = /type CodeErreurFrais =([^;]*);/.exec(texte)?.[1] ?? '';
    const trouves = [...bloc.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(trouves).toEqual([...CODES]);
    expect(new Set(CODES).size).toBe(11);
  });

  it.each(CODES)('erreur-porte-son-code %s', (c) => {
    const e = new ErreurFrais(c, 'message fictif');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(ErreurFrais);
    expect(e.code).toBe(c);
    expect(e.name).toBe('ErreurFrais');
    expect(e.message).toBe('message fictif');
  });

  it('statuts-de-sortie', () => {
    for (const s of STATUTS) expect(estStatutSortie(s)).toBe(SORTIES.includes(s));
  });

  it('statuts-finals', () => {
    for (const s of STATUTS) expect(estStatutFinal(s)).toBe(FINALS.includes(s));
  });

  it('brouillon-ni-sortie-ni-final', () => {
    expect(estStatutSortie('brouillon')).toBe(false);
    expect(estStatutFinal('brouillon')).toBe(false);
    expect(estStatutFinal('valide')).toBe(false);
    expect(estStatutFinal('a_completer')).toBe(false);
    expect(estStatutFinal('propose')).toBe(false);
  });

  it('aucun-numero-de-compte-dans-src', () => {
    const texte = readFileSync(new URL('../types.ts', import.meta.url), 'utf8');
    expect(/\d{6}/.test(texte)).toBe(false);
  });
});
