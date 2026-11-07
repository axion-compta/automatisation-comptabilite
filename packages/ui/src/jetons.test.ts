import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { genererCss, jetons } from './jetons.js';
import { polices } from './polices.js';

describe('jetons', () => {
  it('génère une variable CSS par jeton', () => {
    const css = genererCss();
    expect(css).toContain('--couleur-fond: #faf8f5;');
    expect(css).toContain('--couleur-texte-discret: #5c554c;');
    expect(css).toContain('--espace-m: 16px;');
  });
  it('jetons.css est à jour', () => {
    expect(readFileSync(new URL('./jetons.css', import.meta.url), 'utf8')).toBe(genererCss());
  });
  it('couleurs au format hexadécimal', () => {
    for (const c of Object.values(jetons.couleur)) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
  const valide = (v: string) => /^\d+px$/.test(v) && Number.parseInt(v, 10) >= 24;
  it('le jeton de cible vaut 24 px dans le CSS généré', () => {
    expect(genererCss()).toContain('--cible-min: 24px;');
    expect(valide(jetons.cible.min)).toBe(true);
  });
  it('un jeton sous 24 px, vide, NaN, Infinity ou non entier est refusé', () => {
    for (const v of ['23px', '', 'NaNpx', 'Infinitypx', '24.5px', '-24px']) expect(valide(v)).toBe(false);
  });
  it('polices sous licence libre', () => {
    expect(polices.map((p) => p.famille)).toEqual(['Fraunces', 'Manrope']);
    for (const p of polices) expect(p.licence).toBe('OFL-1.1');
  });
});
