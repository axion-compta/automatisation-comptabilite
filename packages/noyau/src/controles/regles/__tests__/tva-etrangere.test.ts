import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import { qualifierOrigine, regleCCT09, regleCCT14, type OrigineAchat } from '../tva-etrangere.js';

const c = (n: number): Centimes => centimes(n);
const UE = ['FR', 'ES', 'DE', 'BE'];
const origine = (p: Partial<OrigineAchat> = {}): OrigineAchat => ({
  paysVendeur: 'ES',
  tvaFrancaise: false,
  declarationDouane: false,
  numeroIoss: false,
  tvaFacturee: c(2100),
  ttc: c(12100),
  ...p,
});
const q = (p: Partial<OrigineAchat> = {}, ue: readonly string[] = UE, societe = 'FR') =>
  qualifierOrigine(origine(p), ue, societe);
const entree = (p: Partial<OrigineAchat> = {}) => ({ origine: origine(p), etatsUe: UE, paysSociete: 'FR' });

describe('CC-T09 et CC-T14 TVA étrangère', () => {
  it('CT-26', () => {
    const logiciel = origine({ paysVendeur: 'US', tvaFacturee: c(0), ttc: c(100000) });
    expect(qualifierOrigine(logiciel, UE, 'FR')).toEqual({ code: 'A_VERIFIER', deduit: c(0), charge: c(0) });
    expect(regleCCT09.evaluer({ origine: logiciel, etatsUe: UE, paysSociete: 'FR' })).toEqual({
      resultat: 'ALERTE',
      valeur: 'A_VERIFIER',
    });
    expect(regleCCT14.evaluer({ origine: logiciel, etatsUe: UE, paysSociete: 'FR' })).toEqual({ resultat: 'OK' });
    expect(regleCCT09).toMatchObject({ id: 'CC-T09', version: 1, gravite: 'B', bloque: ['tva'], actif: true });
    expect(regleCCT09.declencheurs).toEqual(['arrivee', 'continu', 'avant_tva', 'a_la_demande']);

    const espagnole = origine({ tvaFacturee: c(2100), ttc: c(12100), paysVendeur: 'ES' });
    expect(qualifierOrigine(espagnole, UE, 'FR')).toEqual({
      code: 'NON_DEDUCTIBLE_ETRANGERE',
      deduit: c(0),
      charge: c(12100),
    });
    expect(regleCCT14.evaluer({ origine: espagnole, etatsUe: UE, paysSociete: 'FR' })).toEqual({
      resultat: 'ALERTE',
      valeur: 'NON_DEDUCTIBLE_ETRANGERE',
    });
    expect(regleCCT09.evaluer({ origine: espagnole, etatsUe: UE, paysSociete: 'FR' })).toEqual({ resultat: 'OK' });
    expect(regleCCT14).toMatchObject({ id: 'CC-T14', version: 1, gravite: 'M', bloque: [], actif: true });
  });

  it('ioss-a-verifier', () => {
    expect(q({ numeroIoss: true }).code).toBe('A_VERIFIER');
    expect(q({ numeroIoss: true, tvaFacturee: c(0) })).toEqual({ code: 'A_VERIFIER', deduit: c(0), charge: c(0) });
  });

  it('douane-a-verifier-meme-dans-l-ue', () => {
    expect(q({ declarationDouane: true }).code).toBe('A_VERIFIER');
    expect(q({ declarationDouane: true, paysVendeur: 'FR' }).code).toBe('A_VERIFIER');
    expect(q({ declarationDouane: true })).toMatchObject({ deduit: c(0), charge: c(0) });
  });

  it('liste-ue-vide-tout-a-verifier', () => {
    expect(q({}, []).code).toBe('A_VERIFIER');
    expect(q({ paysVendeur: 'FR' }, []).code).toBe('A_VERIFIER');
    expect(q({}, [])).toMatchObject({ deduit: c(0), charge: c(0) });
    const inverse = [...UE].reverse();
    expect(q({}, inverse)).toEqual(q({}, UE));
    expect(q({ paysVendeur: 'US' }, inverse)).toEqual(q({ paysVendeur: 'US' }, UE));
  });

  it('pays-de-la-societe-national', () => {
    expect(q({ paysVendeur: 'FR' }).code).toBe('NATIONAL');
    expect(q({ paysVendeur: 'DE' }, UE, 'DE').code).toBe('NATIONAL');
    expect(q({ paysVendeur: 'ES', tvaFrancaise: true }).code).toBe('NATIONAL');
    expect(q({ tvaFacturee: c(0) }).code).toBe('NATIONAL');
    expect(q({ tvaFacturee: c(1) }).code).toBe('NON_DEDUCTIBLE_ETRANGERE');
    expect(q({ paysVendeur: 'FR' })).toEqual({ code: 'NATIONAL', deduit: c(0), charge: c(0) });
    expect(regleCCT09.evaluer({ ...entree({ paysVendeur: 'FR' }) })).toEqual({ resultat: 'OK' });
    expect(regleCCT14.evaluer({ ...entree({ paysVendeur: 'FR' }) })).toEqual({ resultat: 'OK' });
  });

  it('code-pays-invalide-exception', () => {
    for (const mauvais of ['E', 'esp', '', 'e1', 'ES ']) {
      expect(() => q({ paysVendeur: mauvais })).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    }
    expect(() => q({}, UE, 'F')).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    expect(() => q({}, UE, '')).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    const trace = executerControles(
      [regleCCT09],
      [{ type: 'achat', id: 'a1', donnee: entree({ paysVendeur: 'E' }) }],
      'arrivee',
      '2026-01-01T00:00:00Z',
    );
    expect(trace[0]?.resultat).toBe('IMPOSSIBLE');
  });

  it('aucune-autoliquidation-calculee', () => {
    for (const p of [{ paysVendeur: 'US' }, { numeroIoss: true }, { declarationDouane: true }]) {
      const sortie = q(p);
      expect(Object.keys(sortie).sort()).toEqual(['charge', 'code', 'deduit']);
      expect(sortie.deduit).toBe(0);
      expect(sortie.charge).toBe(0);
    }
  });

  it('montants-invalides', () => {
    const invalide = expect.objectContaining({ code: 'entree_invalide' });
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      expect(() => q({ tvaFacturee: n as Centimes })).toThrow(invalide);
      expect(() => q({ ttc: n as Centimes })).toThrow(invalide);
    }
    expect(() => q({ tvaFacturee: c(12101), ttc: c(12100) })).toThrow(invalide);
    expect(q({ tvaFacturee: c(12100), ttc: c(12100) }).charge).toBe(12100);
    expect(q({ tvaFacturee: c(0), ttc: c(0) }).code).toBe('NATIONAL');
  });
});
