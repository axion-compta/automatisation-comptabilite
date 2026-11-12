import { describe, expect, it } from 'vitest';
import { e17 } from '../e17.js';
import { e17Statuts } from '../e17-statuts.js';

const existants = Object.values(e17.statuts);

describe('E17 statuts brouillon, refusé et personnel', () => {
  it.each([
    ['statut-brouillon-non-vide', 'brouillon'],
    ['statut-refuse-non-vide', 'refuse'],
    ['statut-perso-non-vide', 'perso'],
  ] as const)('%s', (_nom, cle) => {
    const texte = e17Statuts[cle];
    expect(typeof texte).toBe('string');
    expect(texte.trim()).not.toBe('');
    expect(existants).not.toContain(texte);
  });
});
