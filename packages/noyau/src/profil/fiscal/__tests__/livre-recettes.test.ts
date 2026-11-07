import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { ErreurProfil } from '../../types.js';
import {
  livreSurPeriode,
  registreAchatsExige,
  tenueApplicable,
  verifierLigneAchat,
  verifierLigneRecette,
  type LigneRecette,
} from '../livre-recettes.js';

const c = (n: number): Centimes => centimes(n);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const L = (id: string, dateEncaissement: string, montant = 1000, extra: Partial<LigneRecette> = {}): LigneRecette => ({
  id,
  dateEncaissement,
  client: 'Atelier Exemple',
  montantCentimes: c(montant),
  modeReglement: 'virement',
  referenceFacture: 'F-2026-001',
  ...extra,
});

describe('livre-recettes', () => {
  it('ligne-valide', () => {
    expect(verifierLigneRecette(L('a', '2026-03-03'))).toEqual([]);
    expect(
      verifierLigneAchat({ id: 'x', date: '2026-03-03', fournisseur: 'Grossiste Exemple', montantCentimes: c(500), modeReglement: 'carte', referencePiece: 'A-1' }),
    ).toEqual([]);
  });

  it('montant-invalide', () => {
    for (const m of [0, -1, 1.5, Number.NaN, Infinity]) {
      expect(verifierLigneRecette(L('a', '2026-03-03', 1, { montantCentimes: m as Centimes }))).toEqual(['montant_invalide']);
    }
  });

  it('champs-vides-refuses', () => {
    expect(verifierLigneRecette(L('a', '2026-03-03', 1000, { client: '   ' }))).toEqual(['client_vide']);
    expect(verifierLigneRecette(L('a', '2026-03-03', 1000, { referenceFacture: '' }))).toEqual(['reference_vide']);
    expect(verifierLigneRecette(L('a', '2026-02-30'))).toEqual(['date_invalide']);
    expect(verifierLigneRecette(L('a', '2026-03-03', 1000, { modeReglement: 'troc' as never }))).toEqual(['mode_inconnu']);
    expect(verifierLigneRecette(L('a', 'x', 0, { client: '', referenceFacture: ' ' }))).toEqual([
      'montant_invalide',
      'client_vide',
      'reference_vide',
      'date_invalide',
    ]);
    expect(code(() => livreSurPeriode([L('a', '2026-03-03', 1000, { client: '' })], '2026-01-01', '2026-12-31'))).toBe('ligne_invalide');
  });

  it('periode-bornes-incluses', () => {
    const lignes = [L('a', '2026-02-28'), L('b', '2026-03-01'), L('c', '2026-03-31'), L('d', '2026-04-01')];
    expect(livreSurPeriode(lignes, '2026-03-01', '2026-03-31').lignes.map((l) => l.id)).toEqual(['b', 'c']);
    expect(livreSurPeriode(lignes, '2026-03-01', '2026-03-01').lignes.map((l) => l.id)).toEqual(['b']);
    expect(livreSurPeriode([], '2026-03-01', '2026-03-31')).toEqual({ lignes: [], totalCentimes: 0 });
  });

  it('tri-stable', () => {
    const lignes = [L('c', '2026-03-05'), L('b', '2026-03-05'), L('z', '2026-03-01'), L('a', '2026-03-05')];
    const avant = lignes.map((l) => l.id);
    expect(livreSurPeriode(lignes, '2026-03-01', '2026-03-31').lignes.map((l) => l.id)).toEqual(['z', 'a', 'b', 'c']);
    expect(lignes.map((l) => l.id)).toEqual(avant);
  });

  it('total-exact-au-centime', () => {
    const lignes = [L('a', '2026-03-01', 1010), L('b', '2026-03-02', 2020), L('c', '2026-03-03', 1)];
    expect(livreSurPeriode(lignes, '2026-03-01', '2026-03-31').totalCentimes).toBe(3031);
  });

  it('ordre-inverse-refuse', () => {
    expect(code(() => livreSurPeriode([], '2026-03-31', '2026-03-01'))).toBe('ordre_inverse');
    expect(code(() => livreSurPeriode([], '2026-02-30', '2026-03-01'))).toBe('date_invalide');
  });

  it('registre-achats-selon-activite', () => {
    expect(registreAchatsExige('vente_marchandises')).toBe(true);
    expect(registreAchatsExige('mixte')).toBe(true);
    expect(registreAchatsExige('services')).toBe(false);
    expect(code(() => registreAchatsExige('autre' as never))).toBe('activite_inconnue');
  });

  it('tenue-livre-recettes-seulement-ei-micro', () => {
    expect(tenueApplicable({ forme: 'EI', regime: 'micro' })).toBe('livre_recettes');
    expect(tenueApplicable({ forme: 'SARL', regime: 'micro' })).toBe('partie_double');
    expect(tenueApplicable({ forme: 'EI', regime: 'reel_simplifie' })).toBe('partie_double');
    expect(tenueApplicable({ forme: 'EURL', regime: 'reel_normal' })).toBe('partie_double');
  });
});
