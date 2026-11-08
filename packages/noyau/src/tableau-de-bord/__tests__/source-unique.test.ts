import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Fichier {
  chemin: string;
  texte: string;
}

const NOMS = ['calculerChiffres', 'chiffreAffaires', 'resultatProvisoire', 'tresorerie'];
const SOURCE = 'packages/noyau/src/tableau-de-bord/chiffres.ts';
const SOUS_ARBRE = /^(apps|packages)\/[^/]+\/src\//;
const EST_TEST = /(\.test\.|\.spec\.|\/__tests__\/)/;
const IMPORT_INTERDIT = /\b(?:from|import)\s*\(?\s*['"][^'"]*(livres\/balance|tableau-de-bord\/chiffres)(?:\.js)?['"]/;

export function violations(fichiers: Fichier[]): string[] {
  const res: string[] = [];
  for (const nom of NOMS) {
    const motif = new RegExp(`export\\s+(?:async\\s+)?(?:function\\*?|const|let|var|class)\\s+${nom}\\b`, 'g');
    const trouves = fichiers.flatMap((f) =>
      Array.from(f.texte.matchAll(motif), () => f.chemin),
    );
    if (trouves.length !== 1 || trouves[0] !== SOURCE) {
      res.push(`${nom}: définitions dans [${trouves.join(', ')}], attendu une seule dans ${SOURCE}`);
    }
  }
  for (const f of fichiers) {
    if (f.chemin.startsWith('apps/web/src/') && IMPORT_INTERDIT.test(f.texte)) {
      res.push(`${f.chemin}: le front importe un calcul de chiffres`);
    }
  }
  return res;
}

function fichiersDuDepot(): Fichier[] {
  const racine = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const liste = execFileSync('git', ['ls-files', 'apps', 'packages'], { cwd: racine, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split(/\r?\n/)
    .map((c) => c.replaceAll('\\', '/'))
    .filter((c) => SOUS_ARBRE.test(c) && /\.(ts|tsx|js|jsx|mjs|vue)$/.test(c) && !EST_TEST.test(c))
    .filter((c) => !/(^|\/)(node_modules|dist)\//.test(c));
  return liste.map((chemin) => ({ chemin, texte: readFileSync(join(racine, chemin), 'utf8') }));
}

const propre = (): Fichier[] =>
  NOMS.map((n) => ({ chemin: SOURCE, texte: `export function ${n}() {}\n` }));

describe('source unique des chiffres (TB-R1)', () => {
  it('une-seule-definition', () => {
    expect(violations(propre())).toEqual([]);
    const un = [{ chemin: SOURCE, texte: NOMS.map((n) => `export const ${n} = () => 1;`).join('\n') }];
    expect(violations(un)).toEqual([]);
  });

  it('definition-en-double-detectee', () => {
    const double = [...propre(), { chemin: 'apps/serveur/src/copie.ts', texte: 'export function tresorerie() {}' }];
    expect(violations(double)).toHaveLength(1);
    expect(violations(double)[0]).toContain('tresorerie');
    const ailleurs = [{ chemin: 'packages/noyau/src/autre.ts', texte: propre()[0]!.texte }, ...propre().slice(1)];
    expect(violations(ailleurs).length).toBeGreaterThan(0);
    expect(violations([])).toHaveLength(NOMS.length);
  });

  it('front-n-importe-pas-la-balance', () => {
    const web = (texte: string): Fichier[] => [...propre(), { chemin: 'apps/web/src/ecran.tsx', texte }];
    expect(violations(web("import { balance } from '@noyau/livres/balance';"))).toHaveLength(1);
    expect(violations(web("import { x } from '../../tableau-de-bord/chiffres.js';"))).toHaveLength(1);
    expect(violations(web("const m = await import('./tableau-de-bord/chiffres');"))).toHaveLength(1);
    expect(violations(web("import { lire } from './api.js';"))).toEqual([]);
    const serveur = [...propre(), { chemin: 'apps/serveur/src/x.ts', texte: "import { b } from '../livres/balance.js';" }];
    expect(violations(serveur)).toEqual([]);
  });

  it('depot-reel-sans-violation', () => {
    const fichiers = fichiersDuDepot();
    expect(fichiers.some((f) => f.chemin === SOURCE)).toBe(true);
    expect(violations(fichiers)).toEqual([]);
  });
});
