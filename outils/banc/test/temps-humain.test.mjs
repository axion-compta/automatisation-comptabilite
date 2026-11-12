import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lireMesures, rapporter } from '../temps-humain.mjs';

const m = (duree_ms, factureSimple = true) => ({ duree_ms, factureSimple });
const SCRIPT = new URL('../temps-humain.mjs', import.meta.url).pathname;

describe('temps humain', () => {
  it('seules-factures-simples-comptees', () => {
    const r = rapporter([m(1000), m(3000), m(999_000, false), m(5000)], { medianeMs: 10_000, p90Ms: 10_000 });
    expect(r.n).toBe(3);
    expect(r.mediane).toBe(3000);
    expect(rapporter([m(1000, false)], { medianeMs: 1, p90Ms: 1 }).n).toBe(0);
  });

  it('mediane-et-p90-calcules', () => {
    const dix = Array.from({ length: 10 }, (_, i) => m((i + 1) * 1000));
    const r = rapporter(dix, { medianeMs: 5500, p90Ms: 9000 });
    expect(r.mediane).toBe(5500);
    expect(r.p90).toBe(9000);
    expect(r.medianeVsSeuil).toBe('au-dessous');
    expect(r.p90VsSeuil).toBe('au-dessous');
    const serre = rapporter(dix, { medianeMs: 5499, p90Ms: 8999 });
    expect(serre.medianeVsSeuil).toBe('au-dessus');
    expect(serre.p90VsSeuil).toBe('au-dessus');
  });

  it('seuils-en-argument-sans-echec', () => {
    const dir = mkdtempSync(join(tmpdir(), 'th-'));
    const fichier = join(dir, 'mesures.json');
    writeFileSync(fichier, JSON.stringify([m(60_000), m(70_000)]));
    const lance = (...args) => spawnSync('node', [SCRIPT, fichier, ...args], { encoding: 'utf8' });
    const depasse = lance('--seuil-mediane-ms=1000', '--seuil-p90-ms=1000');
    expect(depasse.status).toBe(0);
    expect(depasse.stdout).toContain('au-dessus');
    expect(lance('--seuil-mediane-ms=999999', '--seuil-p90-ms=999999').stdout).toContain('au-dessous');
    expect(lance('--seuil-mediane-ms=abc', '--seuil-p90-ms=1').status).not.toBe(0);
    expect(lance('--seuil-mediane-ms=-1', '--seuil-p90-ms=1').status).not.toBe(0);
    expect(lance().status).not.toBe(0);
    writeFileSync(fichier, '{pas du json');
    expect(lance('--seuil-mediane-ms=1', '--seuil-p90-ms=1').status).not.toBe(0);
    for (const t of ['[{"duree_ms":-1,"factureSimple":true}]', '[{"duree_ms":1.5,"factureSimple":true}]', '[{"duree_ms":1,"factureSimple":"oui"}]', '{}']) {
      expect(() => lireMesures(t), t).toThrow();
    }
  });
});
