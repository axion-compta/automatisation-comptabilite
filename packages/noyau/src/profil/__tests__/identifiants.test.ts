import { describe, expect, it } from 'vitest';
import { ErreurProfil } from '../types.js';
import { cleTvaFrancaise, normaliserIdentifiant, siretValide, sirenValide, verifierTvaFrancaise } from '../identifiants.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const luhnOk = (t: string): boolean => {
  let s = 0;
  [...t].reverse().forEach((c, i) => {
    const d = Number(c) * (i % 2 === 1 ? 2 : 1);
    s += d > 9 ? d - 9 : d;
  });
  return s % 10 === 0;
};
const cle = (siren: string): string => String((12 + 3 * (Number(siren) % 97)) % 97).padStart(2, '0');
const ok = '123456782';

describe('identifiants du profil', () => {
  it('siren-p01-accepte', () => {
    expect(sirenValide(ok)).toBe(true);
    expect(sirenValide('987654324')).toBe(true);
  });
  it('siren-p01-refuse', () => {
    expect(sirenValide('123456789')).toBe(false);
  });
  it('siren-forme', () => {
    for (const t of ['12345678', '1234567820', 'abcdefghi', '１２３４５６７８２', '']) expect(sirenValide(t)).toBe(false);
    expect(sirenValide('123 456 782')).toBe(true);
    expect(sirenValide('123 456 782')).toBe(true);
    expect(normaliserIdentifiant(' fr 1 2 ')).toBe('fr12');
    expect(normaliserIdentifiant('')).toBe('');
  });
  it('siret-valide-et-refuse', () => {
    let siret = '';
    for (let n = 0; n < 10 && siret === ''; n += 1) if (luhnOk(ok + '0000' + n)) siret = ok + '0000' + n;
    expect(siret).toHaveLength(14);
    expect(siretValide(siret)).toBe(true);
    expect(siretValide(siret.slice(0, 13))).toBe(false);
    expect(siretValide(siret + '0')).toBe(false);
    expect(siretValide('12345678900000')).toBe(false);
    expect(siretValide('')).toBe(false);
    expect(siretValide('1234567820001x')).toBe(false);
    const mauvaiseCle = siret.slice(0, 13) + String((Number(siret[13]) + 1) % 10);
    expect(siretValide(mauvaiseCle)).toBe(false);
    // SIREN faux mais SIRET de clé juste : refusé
    for (let n = 0; n < 10; n += 1) if (luhnOk('123456789' + '0000' + n)) expect(siretValide('123456789' + '0000' + n)).toBe(false);
  });
  it('cle-tva-p02', () => {
    expect(cleTvaFrancaise(ok)).toBe('11');
    expect(verifierTvaFrancaise('FR11123456782')).toEqual({ valide: true });
    expect(verifierTvaFrancaise(' FR 11 123 456 782 ').valide).toBe(true);
  });
  it('cle-tva-fausse-p02', () => {
    expect(verifierTvaFrancaise('FR12123456782')).toEqual({ valide: false, motif: 'cle_fausse', cleAttendue: '11' });
    expect(verifierTvaFrancaise('FR11123456789')).toEqual({ valide: false, motif: 'siren_invalide' });
  });
  it('tva-forme', () => {
    for (const t of ['fr11123456782', 'FR1112345678', 'FR', '', 'FR1112345678x', 'DE11123456782', 'FR111234567820'])
      expect(verifierTvaFrancaise(t)).toEqual({ valide: false, motif: 'forme' });
  });
  it('cle-sur-deux-chiffres', () => {
    let trouve = '';
    for (let n = 0; n < 1000 && trouve === ''; n += 1) {
      const s = String(n).padStart(8, '0') + '0';
      for (let c = 0; c < 10 && trouve === ''; c += 1) {
        const cand = s.slice(0, 8) + c;
        if (luhnOk(cand) && Number(cle(cand)) < 10) trouve = cand;
      }
    }
    expect(trouve).not.toBe('');
    expect(cleTvaFrancaise(trouve)).toBe(cle(trouve));
    expect(cleTvaFrancaise(trouve)).toMatch(/^0[0-9]$/);
    expect(verifierTvaFrancaise('FR' + cle(trouve) + trouve).valide).toBe(true);
  });
  it('siren-invalide-leve-erreur', () => {
    expect(code(() => cleTvaFrancaise('123456789'))).toBe('siren_invalide');
    expect(code(() => cleTvaFrancaise(''))).toBe('siren_invalide');
    expect(code(() => cleTvaFrancaise(ok))).toBeUndefined();
  });
});
