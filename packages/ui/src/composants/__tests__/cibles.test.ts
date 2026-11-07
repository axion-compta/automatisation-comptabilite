// Fiche L01-T49 : cibles tactiles d'au moins 24 px dans packages/ui.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Vrai si une règle du sélecteur donne min-width et min-height de var(--cible-min). */
function aCibleMin(css: string, selecteur: string): boolean {
  const nu = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...nu.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(
    (m) =>
      (m[1] ?? '').split(',').map((s) => s.trim()).includes(selecteur) &&
      /min-width:\s*var\(--cible-min\)\s*(;|$)/.test(m[2] ?? '') &&
      /min-height:\s*var\(--cible-min\)\s*(;|$)/.test(m[2] ?? ''),
  );
}

const lire = (nom: string) => readFileSync(new URL(`../${nom}`, import.meta.url), 'utf8');

describe('cibles tactiles (ui)', () => {
  for (const [fichier, sel] of [
    ['composants.css', '.axion-bouton'],
    ['tableau.css', '.axion-tableau__tri'],
    ['tableau.css', '.axion-tableau__page'],
  ] as const)
    it(`${sel} utilise var(--cible-min)`, () => expect(aCibleMin(lire(fichier), sel)).toBe(true));
  it('le détecteur refuse règle absente, incomplète, vide, en commentaire ou à valeur fixe', () => {
    const ok = 'min-width: var(--cible-min); min-height: var(--cible-min);';
    expect(aCibleMin('', '.a')).toBe(false);
    expect(aCibleMin('.a { min-width: var(--cible-min); }', '.a')).toBe(false);
    expect(aCibleMin('.a { min-height: var(--cible-min); }', '.a')).toBe(false);
    expect(aCibleMin('.a { min-width: 24px; min-height: 24px; }', '.a')).toBe(false);
    expect(aCibleMin(`.b { ${ok} }`, '.a')).toBe(false);
    expect(aCibleMin(`/* .a { ${ok} } */`, '.a')).toBe(false);
    expect(aCibleMin(`.a, .b { ${ok} }`, '.b')).toBe(true);
  });
});
