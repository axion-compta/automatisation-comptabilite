import { describe, expect, it } from 'vitest';
import { tempsGagne } from '../temps-gagne.js';

// Durées fictives d'essai, passées en argument : le code n'en contient aucune.
const DUREES = { rapprochement: 2, saisie: 3 };
const ACTIONS = [{ code: 'rapprochement', nombre: 4 }, { code: 'saisie', nombre: 5 }];

describe('temps gagné', () => {
  it('temps-gagne-toujours-estimation', () => {
    expect(tempsGagne(ACTIONS, DUREES, 'durees d essai').mot).toBe('estimation');
    expect(tempsGagne([], DUREES, 'durees d essai')).toEqual({ minutes: 0, mot: 'estimation', methode: 'durees d essai' });
    expect(tempsGagne(ACTIONS, DUREES, 'durees d essai').minutes).toBe(23);
  });

  it('temps-gagne-jamais-en-euros', () => {
    const sortie = tempsGagne(ACTIONS, DUREES, 'durees d essai');
    expect(Object.keys(sortie).sort()).toEqual(['methode', 'minutes', 'mot']);
    expect(Object.keys(sortie).some((k) => /euro|centime|montant|prix|cout/i.test(k))).toBe(false);
  });

  it('methode-du-temps-gagne-fournie', () => {
    expect(() => tempsGagne(ACTIONS, DUREES, '')).toThrow('methode_absente');
    expect(() => tempsGagne([{ code: 'inconnue', nombre: 1 }], DUREES, 'm')).toThrow('duree_absente');
    expect(() => tempsGagne([{ code: 'saisie', nombre: -1 }], DUREES, 'm')).toThrow('nombre_invalide');
  });
});
