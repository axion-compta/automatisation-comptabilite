import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const DOSSIER = fileURLToPath(new URL('./ecrans/', import.meta.url));
const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).sort();

type Module = Record<string, unknown>;
const modules: Record<string, Module> = {};
for (const f of fichiers) {
  modules[f] = (await import(`./ecrans/${f.slice(0, -3)}.js`)) as Module;
}

function feuilles(o: unknown, chemin: string): Array<[string, unknown]> {
  if (typeof o === 'object' && o !== null) {
    return Object.entries(o).flatMap(([k, v]) => feuilles(v, `${chemin}.${k}`));
  }
  return [[chemin, o]];
}

const textes: Array<[string, unknown]> = Object.entries(modules).flatMap(([f, m]) =>
  Object.values(m).flatMap((objet) => feuilles(objet, f)),
);

describe('textes par écran', () => {
  it('lit au moins le fichier du socle', () => {
    expect(fichiers).toContain('socle.ts');
    expect(textes.length).toBeGreaterThan(0);
  });

  it('chaque-texte-non-vide', () => {
    for (const [chemin, t] of textes) {
      expect(typeof t, chemin).toBe('string');
      expect((t as string).trim().length, chemin).toBeGreaterThan(0);
    }
  });

  it('vouvoiement', () => {
    const tutoiement = /(?<![\p{L}\p{N}_])(tu|ton|ta|tes|toi|te)(?![\p{L}\p{N}_])/iu;
    for (const [chemin, t] of textes) {
      expect(tutoiement.test(t as string), `${chemin} : ${String(t)}`).toBe(false);
    }
    expect(tutoiement.test('Tu peux')).toBe(true);
    expect(tutoiement.test('Vous pouvez')).toBe(false);
  });

  it('pas-d-espace-avant-fin', () => {
    for (const [chemin, t] of textes) {
      expect(t, chemin).toBe((t as string).trim());
    }
  });

  it('un-objet-par-fichier', () => {
    for (const [f, m] of Object.entries(modules)) {
      const exports = Object.values(m);
      expect(exports.length, f).toBe(1);
      expect(typeof exports[0], f).toBe('object');
      expect(exports[0], f).not.toBeNull();
    }
  });
});
