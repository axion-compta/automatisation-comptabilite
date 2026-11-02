import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { genererCss, jetons } from './jetons.ts';
import { polices } from './polices.ts';

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
  it('polices sous licence libre', () => {
    expect(polices.map((p) => p.famille)).toEqual(['Fraunces', 'Manrope']);
    for (const p of polices) expect(p.licence).toBe('OFL-1.1');
  });
});
