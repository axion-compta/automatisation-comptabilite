// Fiche L01-T51 : main.tsx importe les jetons de design avant les autres feuilles.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');
/** Imports de feuilles CSS, dans l'ordre du fichier (commentaires exclus). */
const feuilles = [...source.replace(/\/\/.*$/gm, '').matchAll(/^\s*import\s+'([^']+\.css)';/gm)].map((m) => m[1]!);

describe('jetons de design importés par main.tsx', () => {
  it('importe jetons.css', () => {
    expect(feuilles.some((f) => f.endsWith('packages/ui/src/jetons.css'))).toBe(true);
  });

  it('place jetons.css avant toute autre feuille', () => {
    expect(feuilles[0]?.endsWith('packages/ui/src/jetons.css')).toBe(true);
  });

  it('importe composants.css et tableau.css après les jetons', () => {
    const rang = (nom: string) => feuilles.findIndex((f) => f.endsWith(nom));
    expect(rang('composants/composants.css')).toBeGreaterThan(0);
    expect(rang('composants/tableau.css')).toBeGreaterThan(0);
  });
});
