// Fiche L01-T49 : cibles tactiles d'au moins 24 px dans la coque.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../socle.css', import.meta.url), 'utf8');

/** Vrai si une règle du sélecteur donne min-width et min-height de var(--cible-min). */
function aCibleMin(feuille: string, selecteur: string): boolean {
  const nu = feuille.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...nu.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(
    (m) =>
      (m[1] ?? '').split(',').map((s) => s.trim()).includes(selecteur) &&
      /min-width:\s*var\(--cible-min\)\s*(;|$)/.test(m[2] ?? '') &&
      /min-height:\s*var\(--cible-min\)\s*(;|$)/.test(m[2] ?? ''),
  );
}

describe('cibles tactiles (coque)', () => {
  for (const sel of [
    '.menu-bureau a', '.barre-mobile nav a', '.barre-mobile nav button', '.barre-discuter', '.barre-plus a',
    '.coque-principal li > a', '.coque-principal td a', '.coque-principal button',
    '.coque-principal select', '.coque-principal input',
    '[role="dialog"] input', '[role="dialog"] li > button',
  ])
    it(`${sel} utilise var(--cible-min)`, () => expect(aCibleMin(css, sel)).toBe(true));
  it('le détecteur refuse règle absente, incomplète, vide ou à valeur fixe', () => {
    expect(aCibleMin('', '.a')).toBe(false);
    expect(aCibleMin('.a { min-width: var(--cible-min); }', '.a')).toBe(false);
    expect(aCibleMin('.a { min-width: 24px; min-height: 24px; }', '.a')).toBe(false);
    expect(aCibleMin('.b { min-width: var(--cible-min); min-height: var(--cible-min); }', '.a')).toBe(false);
  });
});
