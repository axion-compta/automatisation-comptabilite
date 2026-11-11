import { describe, expect, it } from 'vitest';
import { e17 } from '../e17.js';
import { e17LibellesStatuts } from '../e17-libelles-statuts.js';

const existants = Object.values(e17.statuts);

describe('E17 libellés des statuts', () => {
  it.each([
    ['statut-brouillon-non-vide', 'brouillon'],
    ['statut-refuse-non-vide', 'refuse'],
    ['statut-perso-non-vide', 'perso'],
  ] as const)('%s', (_nom, cle) => {
    const texte = e17LibellesStatuts[cle];
    expect(typeof texte).toBe('string');
    expect(texte.trim()).not.toBe('');
    expect(existants).not.toContain(texte);
  });
});
