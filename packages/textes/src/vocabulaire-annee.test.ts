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
const ANNEE_COMPTABLE = /ann[ée]es?[\s\u00a0\u202f]+comptables?/gi;
// « année comptable » doit être suivie de ses dates : « (du {debut} au {fin}) ».
const DATES = /^( précédente)? \(du \{debut\} au \{fin\}\)/;
// Mentions (fichier + chemin) qui existaient avant cette règle, hors périmètre de la fiche.
const GENERIQUES = new Set<string>([
  'e19.ts e19.etats.aucuneAnnee',
  'e39.ts e39.champs.exercice_debut',
  'e39.ts e39.champs.exercice_fin',
  'e45.ts e45.champs.exercice_debut',
  'e45.ts e45.champs.exercice_fin',
  'e45.ts e45.annees',
  'n03.ts n03.titre',
  'n03.ts n03.legende',
  'n03.ts n03.chargement',
  'n03.ts n03.vide',
  'n03.ts n03.videDetail',
  'n03.ts n03.erreur.acces',
  'n03.ts n03.erreur.autre',
  'n04.ts n04.etats.aucuneAnnee',
  'n04.ts n04.etats.introuvable',
]);

const estTitre = (chemin: string): boolean => chemin.split('.').some((s) => /titre|legende/i.test(s));
const titres = (): Feuille[] => toutes.filter((t) => estTitre(t.chemin));
const dit = (texte: string): boolean => EXERCICE.test(texte);

function sansDates(t: Feuille): boolean {
  return [...t.texte.matchAll(ANNEE_COMPTABLE)].some((m) => !DATES.test(t.texte.slice((m.index ?? 0) + m[0].length)));
}

describe('vocabulaire année comptable', () => {
  it('exercice-absent-des-titres', () => {
    expect(titres().length).toBeGreaterThan(10);
    expect(titres().filter((t) => dit(t.texte)).map((t) => `${t.fichier} ${t.chemin}`)).toEqual([]);
    // Le filtre retient tout segment titre ou legende, quelle que soit la casse.
    for (const c of ['a.titre', 'a.videTitre', 'a.sansTitre', 'a.titres.ALR-04', 'a.legendeTableau', 'a.verifierTitre', 'a.conservationTitre']) {
      expect(estTitre(c), c).toBe(true);
    }
    expect(estTitre('a.corps.texte')).toBe(false);
    // La règle voit « exercice » quelle que soit la casse.
    for (const t of ['exercice', 'Exercice 2026', 'EXERCICE', 'Clore un exercice']) expect(dit(t), t).toBe(true);
    expect(dit('Année comptable')).toBe(false);
  });

  it('annee-comptable-avec-dates', () => {
    const fautives = toutes.filter((t) => !GENERIQUES.has(`${t.fichier} ${t.chemin}`) && sansDates(t));
    expect(fautives.map((t) => `${t.fichier} ${t.chemin}`)).toEqual([]);
    // Liste exacte : une entrée qui n'existe plus ou ne dit plus « année comptable » doit être retirée.
    for (const cle of GENERIQUES) {
      const t = toutes.find((x) => `${x.fichier} ${x.chemin}` === cle);
      expect(t !== undefined && new RegExp(ANNEE_COMPTABLE.source, 'i').test(t.texte), cle).toBe(true);
    }
    // La règle détecte bien une mention non datée, et accepte une mention datée.
    expect(sansDates({ fichier: 'x', chemin: 'x', texte: 'Votre année comptable est ouverte' })).toBe(true);
    expect(sansDates({ fichier: 'x', chemin: 'x', texte: 'Année comptable (du {debut} au {fin})' })).toBe(false);
    expect(sansDates({ fichier: 'x', chemin: 'x', texte: 'Année comptable précédente (du {debut} au {fin})' })).toBe(false);
  });

  it('e56-e57-corriges', () => {
    const e = toutes.filter((t) => t.fichier === 'e56.ts' || t.fichier === 'e57.ts');
    expect(e.length).toBeGreaterThan(20);
    expect(e.filter((t) => dit(t.texte)).map((t) => `${t.fichier} ${t.chemin}`)).toEqual([]);
  });
});
