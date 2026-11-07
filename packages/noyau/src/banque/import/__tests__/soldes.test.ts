import { describe, expect, it } from 'vitest';
import { ErreurArgent, centimes } from '../../../argent/index.js';
import type { Centimes } from '../../../argent/index.js';
import type { EtatTechnique, LigneLue, ReleveLu } from '../../types.js';
import { ErreurSoldes, controlerSoldes } from '../soldes.js';

const ligne = (rang: number, montant: number, etatTechnique: EtatTechnique = 'completee'): LigneLue => ({
  rang, dateOperation: '2026-03-05', montant: centimes(montant), devise: 'EUR', libelleBrut: `Operation ${rang}`, etatTechnique,
});
const releve = (lignes: LigneLue[], ouverture?: number, cloture?: number): ReleveLu => {
  const r: ReleveLu = { devise: 'EUR', lignes, rejets: [] };
  if (ouverture !== undefined) r.soldeOuverture = ouverture as Centimes;
  if (cloture !== undefined) r.soldeCloture = cloture as Centimes;
  return r;
};
const REFUSER = { refuserSiEcart: true };
const SIGNALER = { refuserSiEcart: false };
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurSoldes ? e.code : e instanceof ErreurArgent ? 'argent' : 'autre';
  }
  return undefined;
};

describe('contrôle des soldes au centime', () => {
  it('t02-1-solde-ok', () => {
    expect(controlerSoldes(releve([ligne(1, -234567)], 1000000, 765433), REFUSER)).toEqual({ controle: 'OK', calcule: 765433, refuse: false });
  });

  it('t02-4-sans-solde-impossible', () => {
    const sans = controlerSoldes(releve([ligne(1, 100)]), REFUSER);
    expect(sans).toEqual({ controle: 'IMPOSSIBLE', refuse: false });
    expect(controlerSoldes(releve([ligne(1, 100)], 500), REFUSER).controle).toBe('IMPOSSIBLE');
    expect(controlerSoldes(releve([ligne(1, 100)], undefined, 600), REFUSER)).toEqual({ controle: 'IMPOSSIBLE', refuse: false });
  });

  it('t02-5-pdf-falsifie-refuse', () => {
    expect(controlerSoldes(releve([ligne(1, 118025)], 320000, 439025), REFUSER)).toEqual({ controle: 'ECART', ecart: 1000, calcule: 438025, refuse: true });
    expect(controlerSoldes(releve([ligne(1, 118025)], 320000, 438025), REFUSER)).toMatchObject({ controle: 'OK', refuse: false });
  });

  it('ecart-csv-signale-non-refuse', () => {
    expect(controlerSoldes(releve([ligne(1, 100)], 0, 150), SIGNALER)).toEqual({ controle: 'ECART', ecart: 50, calcule: 100, refuse: false });
  });

  it('en-attente-exclue-de-la-somme', () => {
    const lignes = [ligne(1, 100), ligne(2, 900, 'en_attente'), ligne(3, 900, 'annulee'), ligne(4, 900, 'rejetee'), ligne(5, 50)];
    expect(controlerSoldes(releve(lignes, 1000, 1150), REFUSER)).toMatchObject({ controle: 'OK', calcule: 1150 });
  });

  it('ecart-signe-negatif', () => {
    expect(controlerSoldes(releve([ligne(1, 100)], 0, 70), REFUSER)).toEqual({ controle: 'ECART', ecart: -30, calcule: 100, refuse: true });
  });

  it('ordre-des-lignes-sans-effet', () => {
    const l = [ligne(1, 500), ligne(2, -200), ligne(3, 75)];
    const a = controlerSoldes(releve(l, 1000, 1375), REFUSER);
    expect(controlerSoldes(releve([...l].reverse(), 1000, 1375), REFUSER)).toEqual(a);
    expect(a.controle).toBe('OK');
  });

  it('zero-ligne-calcule-egal-ouverture', () => {
    expect(controlerSoldes(releve([], 1000, 1000), REFUSER)).toEqual({ controle: 'OK', calcule: 1000, refuse: false });
    expect(controlerSoldes(releve([], 1000, 900), REFUSER)).toMatchObject({ controle: 'ECART', ecart: -100, calcule: 1000 });
  });

  it('solde-invalide-jamais-ok', () => {
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 12.5]) {
      expect(code(() => controlerSoldes(releve([], mauvais, 0), REFUSER))).toBe('montant_invalide');
      expect(code(() => controlerSoldes(releve([], 0, mauvais), REFUSER))).toBe('montant_invalide');
      expect(code(() => controlerSoldes(releve([], mauvais), REFUSER))).toBe('montant_invalide');
      expect(code(() => controlerSoldes(releve([], undefined, mauvais), SIGNALER))).toBe('montant_invalide');
    }
  });

  it('somme-au-dela-de-l-entier-sur-propagee', () => {
    const grand = Number.MAX_SAFE_INTEGER;
    expect(code(() => controlerSoldes(releve([ligne(1, grand), ligne(2, grand)], 0, 0), REFUSER))).toBe('argent');
    expect(code(() => controlerSoldes(releve([ligne(1, grand)], grand, 0), REFUSER))).toBe('argent');
  });
});
