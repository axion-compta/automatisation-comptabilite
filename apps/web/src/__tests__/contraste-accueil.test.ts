// Fiche L01-T53 : contraste du bouton Discuter de l'accueil téléphone (WCAG 2.x, ratio d'au moins 4,5).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const jetons = readFileSync(new URL('../../../../packages/ui/src/jetons.css', import.meta.url), 'utf8');
const socle = readFileSync(new URL('../socle/socle.css', import.meta.url), 'utf8');

function jeton(nom: string): string {
  const m = new RegExp(`--${nom}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(jetons);
  if (!m) throw new Error(`jeton introuvable : ${nom}`);
  return m[1]!;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

/** Spécificité [id, classes, éléments] d'un sélecteur sans pseudo-éléments ni combinateurs exotiques. */
function specificite(selecteur: string): [number, number, number] {
  const s = selecteur.replace(/\[[^\]]*\]/g, '.x').replace(/:[a-z-]+/g, '.x');
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const classes = (s.match(/\.[\w-]+/g) ?? []).length;
  const elements = (s.replace(/[#.][\w-]+/g, ' ').match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return [ids, classes, elements];
}

function plusFort(a: [number, number, number], b: [number, number, number]): boolean {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! > b[i]!;
  return false;
}

/** Règles `sélecteurs { corps }` du socle, imbriquées dans une media query comprises. */
const regles = [...socle.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selecteurs: m[1]!.replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((s) => s.trim()),
  corps: m[2]!,
}));
const aCouleur = (corps: string) => /(^|[;\s])color:/.test(corps);

describe('contraste du bouton Discuter (accueil téléphone)', () => {
  it('le texte du bouton sur son fond atteint 4,5 selon les jetons', () => {
    expect(ratio(jeton('couleur-accent-texte'), jeton('couleur-accent'))).toBeGreaterThanOrEqual(4.5);
  });

  const regleDiscuter = regles.find((r) => r.selecteurs.some((s) => s.includes('.barre-discuter')) && aCouleur(r.corps));
  const regleHerite = regles.find((r) => r.selecteurs.includes('.barre-mobile button') && aCouleur(r.corps));

  it('une règle fixe la couleur de .barre-discuter avec le jeton de texte', () => {
    expect(regleDiscuter).toBeDefined();
    expect(regleDiscuter!.corps).toMatch(/(^|[;\s])color:\s*var\(--couleur-accent-texte\)/);
  });

  it('cette règle l\'emporte sur .barre-mobile button', () => {
    const selecteur = regleDiscuter!.selecteurs.find((s) => s.includes('.barre-discuter'))!;
    expect(regleHerite).toBeDefined();
    expect(plusFort(specificite(selecteur), specificite('.barre-mobile button'))).toBe(true);
  });
});
