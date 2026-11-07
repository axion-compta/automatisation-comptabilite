import { describe, expect, it } from 'vitest';
import { avancer, creerFiche, ErreurVeille, type Acteur, type FicheChangement } from '../veille-circuit.js';

const T0 = '2026-03-01T08:00:00Z';
const T1 = '2026-03-02T08:00:00Z';
const T2 = '2026-03-03T08:00:00Z';
const T3 = '2026-03-04T08:00:00Z';
const T4 = '2026-03-05T08:00:00Z';
const T5 = '2026-03-06T08:00:00Z';
const IA: Acteur = { type: 'ia', id: 'assistant-1' };
const MARIE: Acteur = { type: 'personne', id: 'marie-exemple' };

function neuve(): FicheChangement {
  return creerFiche({ id: 'F1', sourceId: 'S1', detecteeLe: T0, empreinteAvant: 'aaa', empreinteApres: 'bbb' });
}

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurVeille);
    return (e as ErreurVeille).code;
  }
  return undefined;
}

describe('avancer', () => {
  it('circuit-complet-dans-l-ordre', () => {
    let f = neuve();
    f = avancer(f, 'resumer', IA, T1, { resume: 'Le taux change' });
    expect(f.statut).toBe('resumee');
    expect(f.resumeIa).toBe('Le taux change');
    f = avancer(f, 'valider', MARIE, T2, { parametresTouches: ['tva.taux_a', 'tva.taux_b'] });
    expect(f.statut).toBe('validee');
    expect(f.validateur).toBe('marie-exemple');
    expect(f.parametresTouches).toEqual(['tva.taux_a', 'tva.taux_b']);
    f = avancer(f, 'tester', MARIE, T3);
    expect(f.statut).toBe('testee');
    f = avancer(f, 'signer', MARIE, T4);
    expect(f.statut).toBe('signee');
    f = avancer(f, 'publier', MARIE, T5, { paquetId: 'P1' });
    expect(f.statut).toBe('publiee');
    expect(f.paquetId).toBe('P1');
    expect(f.historique.map((h) => [h.de, h.vers, h.par.id, h.le])).toEqual([
      ['detectee', 'resumee', 'assistant-1', T1],
      ['resumee', 'validee', 'marie-exemple', T2],
      ['validee', 'testee', 'marie-exemple', T3],
      ['testee', 'signee', 'marie-exemple', T4],
      ['signee', 'publiee', 'marie-exemple', T5],
    ]);
  });

  it('saut-d-etat-refuse', () => {
    expect(code(() => avancer(neuve(), 'valider', MARIE, T1))).toBe('transition_interdite');
    expect(code(() => avancer(neuve(), 'tester', MARIE, T1))).toBe('transition_interdite');
    expect(code(() => avancer(neuve(), 'signer', MARIE, T1))).toBe('transition_interdite');
    expect(code(() => avancer(neuve(), 'publier', MARIE, T1, { paquetId: 'P' }))).toBe('transition_interdite');
  });
});
