import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

// Lexique : « année comptable » à l'écran, « exercice » dans le code, le contrat et le FEC.
const DOSSIER = fileURLToPath(new URL('./ecrans/', import.meta.url));
const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).sort();

type Feuille = { fichier: string; chemin: string; texte: string };

function feuilles(o: unknown, fichier: string, chemin: string): Feuille[] {
  if (typeof o === 'string') return [{ fichier, chemin, texte: o }];
  if (typeof o === 'object' && o !== null) {
    return Object.entries(o).flatMap(([k, v]) => feuilles(v, fichier, `${chemin}.${k}`));
  }
  return [];
}

const toutes: Feuille[] = [];
for (const f of fichiers) {
  const m = (await import(/* @vite-ignore */ pathToFileURL(`${DOSSIER}${f}`).href)) as Record<string, unknown>;
  for (const [nom, objet] of Object.entries(m)) toutes.push(...feuilles(objet, f, nom));
}

const EXERCICE = /exercice/i;
const ANNEE_COMPTABLE = /ann[ée]e comptable/gi;
// « année comptable » doit être suivie de ses dates : « (du {debut} au {fin}) ».
const DATES = /^( précédente)? \(du \{debut\} au \{fin\}\)/;
// Mentions génériques qui existaient avant cette règle (aucune année précise visée) : toute nouvelle mention doit être datée.
const GENERIQUES = new Set([
  'e19.ts', 'e39.ts', 'e45.ts', 'n03.ts', 'n04.ts',
]);

function titres(): Feuille[] {
  return toutes.filter((t) => /\.(titre|legende)$/.test(t.chemin));
}

function sansDates(t: Feuille): boolean {
  return [...t.texte.matchAll(ANNEE_COMPTABLE)].some((m) => !DATES.test(t.texte.slice((m.index ?? 0) + m[0].length)));
}

describe('vocabulaire année comptable', () => {
  it('exercice-absent-des-titres', () => {
    expect(titres().length).toBeGreaterThan(10);
    expect(titres().filter((t) => EXERCICE.test(t.texte)).map((t) => `${t.fichier} ${t.chemin}`)).toEqual([]);
  });

  it('annee-comptable-avec-dates', () => {
    const fautives = toutes.filter((t) => !GENERIQUES.has(t.fichier) && sansDates(t));
    expect(fautives.map((t) => `${t.fichier} ${t.chemin}`)).toEqual([]);
    // La règle détecte bien une mention non datée, et accepte une mention datée.
    expect(sansDates({ fichier: 'x', chemin: 'x', texte: 'Votre année comptable est ouverte' })).toBe(true);
    expect(sansDates({ fichier: 'x', chemin: 'x', texte: 'Année comptable (du {debut} au {fin})' })).toBe(false);
    expect(sansDates({ fichier: 'x', chemin: 'x', texte: 'Année comptable précédente (du {debut} au {fin})' })).toBe(false);
  });

  it('e56-e57-corriges', () => {
    const e = toutes.filter((t) => t.fichier === 'e56.ts' || t.fichier === 'e57.ts');
    expect(e.length).toBeGreaterThan(20);
    expect(e.filter((t) => EXERCICE.test(t.texte)).map((t) => `${t.fichier} ${t.chemin}`)).toEqual([]);
  });
});
