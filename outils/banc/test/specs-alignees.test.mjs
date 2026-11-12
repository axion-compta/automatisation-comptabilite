import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyser } from '../specs-alignees.mjs';

const SCRIPT = fileURLToPath(new URL('../specs-alignees.mjs', import.meta.url));
const JSON_INTERDITES = fileURLToPath(new URL('../../../packages/parametres/donnees/valeurs-interdites.json', import.meta.url));
const interdites = [
  { id: 'T-1', motif: 'fictif', motifRegex: 'valeur\\s+X\\b', formes: ['SARL'] },
  { id: 'T-2', motif: 'fictif', motifRegex: 'valeur\\s+Y\\b', formes: ['SAS'] },
];
const dossier = (fichiers) => {
  const d = mkdtempSync(join(tmpdir(), 'specs-'));
  for (const [nom, texte] of Object.entries(fichiers)) {
    mkdirSync(join(d, nom, '..'), { recursive: true });
    writeFileSync(join(d, nom), texte);
  }
  return d;
};
const lancer = (extra = {}) => {
  const env = { ...process.env, ...extra };
  if (extra.SPECS_DOSSIER === undefined) delete env.SPECS_DOSSIER;
  return spawnSync(process.execPath, [SCRIPT], { env, encoding: 'utf8' });
};

describe('specs alignées', () => {
  it('spec-fictive-saine-aucun-ecart', () => {
    const d = dossier({ 'a.md': 'Rien à signaler.\nLigne deux.\n' });
    expect(analyser(d, interdites)).toEqual([]);
    expect(analyser(dossier({}), interdites)).toEqual([]);
  });

  it('valeur-interdite-trouvee-ligne-exacte', () => {
    const d = dossier({ 'a.md': 'ok\nok\nici valeur X trouvée\n', 'sous/b.md': 'valeur Y\n', 'c.bin': 'valeur X\n', 'd.txt': 'valeur X\n', 'e.json': 'valeur Y\n', 'f.md': 'VALEUR X\n' });
    expect(analyser(d, interdites)).toEqual([
      { fichier: 'a.md', ligne: 3, id: 'T-1' },
      { fichier: 'd.txt', ligne: 1, id: 'T-1' },
      { fichier: 'e.json', ligne: 1, id: 'T-2' },
      { fichier: 'f.md', ligne: 1, id: 'T-1' },
      { fichier: join('sous', 'b.md'), ligne: 1, id: 'T-2' },
    ]);
    expect(analyser(dossier({ 'a.md': 'valeur Xi\n' }), interdites)).toEqual([]);
  });

  it('forme-non-concernee-ignoree', () => {
    const d = dossier({ 'a.md': 'valeur X\nvaleur Y\n' });
    expect(analyser(d, interdites, { forme: 'SARL' })).toEqual([{ fichier: 'a.md', ligne: 1, id: 'T-1' }]);
    expect(analyser(d, interdites, { forme: 'SAS' })).toEqual([{ fichier: 'a.md', ligne: 2, id: 'T-2' }]);
    expect(analyser(d, interdites, { forme: 'EI' })).toEqual([]);
    const reel = dossier({ 'a.md': 'compte 108\n' });
    expect(lancer({ SPECS_DOSSIER: reel, SPECS_FORME: 'EI' }).status).toBe(0);
    expect(lancer({ SPECS_DOSSIER: reel, SPECS_FORME: 'SARL' }).status).toBe(1);
  });

  it('sortie-sans-extrait', () => {
    const d = dossier({ 'a.md': 'secret-fictif compte 108 fin\n' });
    const r = lancer({ SPECS_DOSSIER: d });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('a.md');
    expect(r.stdout).toContain(':1');
    expect(r.stdout + r.stderr).not.toContain('secret-fictif');
    expect(r.stdout + r.stderr).not.toContain('compte 108');
    expect(lancer({ SPECS_DOSSIER: dossier({ 'a.md': 'ok\n' }) }).status).toBe(0);
  });

  it('sans-variable-ignore-avec-message', () => {
    const r = lancer();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('L22-T33');
    expect(r.stdout).toContain('ignoré');
    const vide = lancer({ SPECS_DOSSIER: '' });
    expect(vide.status).toBe(0);
    expect(vide.stdout).toContain('L22-T33');
    expect(vide.stdout).toContain('ignoré');
    const absent = lancer({ SPECS_DOSSIER: join(tmpdir(), 'dossier-absent-xyz') });
    expect(absent.status).toBe(1);
    expect(absent.stdout).toContain('L22-T33');
    expect(absent.stderr).toBe('');
  });

  it('json-bien-forme', () => {
    const j = JSON.parse(readFileSync(JSON_INTERDITES, 'utf8'));
    expect(j.entrees.length).toBeGreaterThan(0);
    const ids = j.entrees.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of j.entrees) {
      expect(e.id).toMatch(/^VI-\d{3}$/);
      expect(typeof e.motif).toBe('string');
      expect(e.motif).not.toBe('');
      expect(() => new RegExp(e.motifRegex)).not.toThrow();
      expect(e.motifRegex).not.toBe('');
      expect(Array.isArray(e.formes)).toBe(true);
      expect(e.formes.length).toBeGreaterThan(0);
    }
  });

  it.skipIf(!process.env.SPECS_DOSSIER)('specs-hors-depot : aucun écart (L22-T33)', () => {
    const j = JSON.parse(readFileSync(JSON_INTERDITES, 'utf8'));
    expect(analyser(process.env.SPECS_DOSSIER, j.entrees, { forme: process.env.SPECS_FORME || undefined })).toEqual([]);
  });
});
