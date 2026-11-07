import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { genererCss, jetons } from './jetons.js';

/** Teinte (0-360) et saturation HSL (0-1) d'une couleur #rrggbb. */
function teinteSaturation(hex: string): { teinte: number; saturation: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return { teinte: 0, saturation: 0 };
  const l = (max + min) / 2;
  const saturation = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { teinte: (h * 60 + 360) % 360, saturation };
}

const px = (v: string): number => Number(v.replace('px', ''));

describe('règles de la console', () => {
  it('aucune-couleur-bleue', () => {
    const couleurs = Object.entries(jetons.couleur);
    expect(couleurs.length).toBeGreaterThan(10);
    for (const [nom, hex] of couleurs) {
      const { teinte, saturation } = teinteSaturation(hex);
      const bleue = teinte >= 180 && teinte <= 260 && saturation > 0.15;
      expect(bleue, `${nom} ${hex}`).toBe(false);
    }
    // le détecteur reconnaît bien un bleu
    const bleu = teinteSaturation('#2060d0');
    expect(bleu.teinte >= 180 && bleu.teinte <= 260 && bleu.saturation > 0.15).toBe(true);
  });
  it('graisse-max-600', () => {
    const graisses = Object.values(jetons.graisse);
    expect(graisses).toContain(400);
    expect(graisses).toContain(600);
    for (const g of graisses) expect(g).toBeLessThanOrEqual(600);
  });
  it('texte-au-moins-14px', () => {
    expect(px(jetons.taille.texte)).toBeGreaterThanOrEqual(14);
    expect(px(jetons.taille.titre)).toBeGreaterThanOrEqual(px(jetons.taille.texte));
  });
  it('rupture-720', () => {
    expect(jetons.rupture.mobile).toBe('720px');
  });
  it('rayon-carte-22', () => {
    expect(jetons.rayon.carte).toBe('22px');
  });
  it('css-genere-a-jour', () => {
    const css = readFileSync(new URL('./jetons.css', import.meta.url), 'utf8');
    expect(css).toBe(genererCss());
    expect(css).toContain('--graisse-forte: 600;');
    expect(css).toContain('--rayon-carte: 22px;');
  });
});
