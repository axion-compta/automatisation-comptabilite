import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { EcartFec } from '../controles-structure.js';
import { type EntreeRapportFec, ErreurRapportFec, rapportFec } from '../rapport.js';

const octets = new TextEncoder().encode('JournalCode|EcritureNum\nVT|1\n');
const base: EntreeRapportFec = {
  octets,
  ecarts: [],
  reglesVerifiees: 12,
  reglesNonExecutees: [],
  totalDebit: centimes(1900000),
  totalCredit: centimes(1900000),
  nombreLignes: 8,
  versionLogiciel: '0.0.0-test',
  versionPaquet: '0.0.0-test',
};
const ecart = (regleId: string, ligne: number): EcartFec => ({ regleId, ligne });

describe('rapport FEC', () => {
  it('rapport-propre-autorise', () => {
    const r = rapportFec(base, 20);
    expect(r.telechargementAutorise).toBe(true);
    expect(r.mention).toBe('prepare_par_ia');
    expect(r.ecartsParRegle).toEqual([]);
    expect([r.reglesVerifiees, r.nombreLignes, r.totalDebit, r.totalCredit]).toEqual([12, 8, 1900000, 1900000]);
    expect([r.versionLogiciel, r.versionPaquet]).toEqual(['0.0.0-test', '0.0.0-test']);
  });

  it('un-ecart-interdit', () => {
    const r = rapportFec({ ...base, ecarts: [ecart('FEC-S01', 2)] }, 20);
    expect(r.telechargementAutorise).toBe(false);
    expect(r.ecartsParRegle).toEqual([{ regleId: 'FEC-S01', nombre: 1, premiers: [ecart('FEC-S01', 2)] }]);
  });

  it('regle-non-executee-interdit', () => {
    expect(rapportFec({ ...base, reglesNonExecutees: ['FEC-S05'] }, 20).telechargementAutorise).toBe(false);
  });

  it('empreinte-egale-au-fichier', () => {
    const attendu = createHash('sha256').update(octets).digest('hex');
    expect(rapportFec(base, 20).sha256).toBe(attendu);
    expect(rapportFec({ ...base, octets: new Uint8Array(0) }, 20).sha256).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(rapportFec({ ...base, octets: new Uint8Array([...octets, 0]) }, 20).sha256).not.toBe(attendu);
  });

  it('ecarts-groupes-et-limites', () => {
    const ecarts = [ecart('FEC-S09', 5), ecart('FEC-S02', 3), ecart('FEC-S09', 4), ecart('FEC-S02', 2), ecart('FEC-S09', 6)];
    const r = rapportFec({ ...base, ecarts }, 2);
    expect(r.ecartsParRegle.map((g) => [g.regleId, g.nombre, g.premiers.map((e) => e.ligne)])).toEqual([
      ['FEC-S02', 2, [3, 2]],
      ['FEC-S09', 3, [5, 4]],
    ]);
    const zero = rapportFec({ ...base, ecarts }, 0);
    expect(zero.ecartsParRegle.map((g) => [g.regleId, g.nombre, g.premiers.length])).toEqual([
      ['FEC-S02', 2, 0],
      ['FEC-S09', 3, 0],
    ]);
    const grand = rapportFec({ ...base, ecarts }, 100);
    expect(grand.ecartsParRegle[1]?.premiers).toHaveLength(3);
  });

  it('nombre-invalide-refuse', () => {
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 1.5]) {
      expect(() => rapportFec({ ...base, reglesVerifiees: n }, 20)).toThrow(ErreurRapportFec);
      expect(() => rapportFec(base, n)).toThrow(ErreurRapportFec);
    }
    expect(() => rapportFec({ ...base, reglesVerifiees: -1 }, 20)).toThrow(expect.objectContaining({ code: 'nombre_invalide' }));
    expect(rapportFec({ ...base, reglesVerifiees: 0 }, 0).reglesVerifiees).toBe(0);
  });
});
