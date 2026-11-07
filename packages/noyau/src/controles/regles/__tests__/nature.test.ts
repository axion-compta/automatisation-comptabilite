import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import { motifsNature, regleCCK12, regleCCK12H } from '../nature.js';
import type { ObjetNature } from '../nature.js';

const c = (n: number): Centimes => n as Centimes;
const ligne = (ht: number, nature = 'fournitures') => ({ taux: 0, nature, ht: c(ht), tva: c(0), ttc: c(ht) });
const base: ObjetNature = {
  ligne: ligne(10000),
  comptepropose: '606000',
  natureDurable: false,
  natureCaution: false,
  seuilImmobilisation: c(50000),
  comptesDepot: ['275000'],
  prefixesCharge: ['6'],
  prefixesImmobilisation: ['21'],
  naturesHorsActivite: ['voyage'],
};
const avec = (p: Partial<ObjetNature>): ObjetNature => ({ ...base, ...p });

describe('CC-K12 nature douteuse', () => {
  it('CT-13', () => {
    const o = avec({ ligne: ligne(90000, 'caution'), comptepropose: '613200', natureCaution: true });
    expect(motifsNature(o)).toEqual(['caution_en_charge']);
    expect(regleCCK12.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'caution_en_charge' });
    expect(regleCCK12.evaluer({ ...o, comptepropose: '275000' })).toEqual({ resultat: 'OK' });
    expect(regleCCK12.id).toBe('CC-K12');
    expect(regleCCK12.version).toBe(1);
    expect(regleCCK12.gravite).toBe('M');
    expect(regleCCK12.bloque).toEqual([]);
    expect(regleCCK12.declencheurs).toEqual(['arrivee', 'continu', 'a_la_demande']);
    expect(regleCCK12H.id).toBe('CC-K12H');
    expect(regleCCK12H.gravite).toBe('m');
    expect(regleCCK12H.bloque).toEqual([]);
    expect(regleCCK12H.declencheurs).toEqual(['arrivee', 'continu', 'a_la_demande']);
  });

  it('seuil-exact-immobilisation', () => {
    const durable = (ht: number) => avec({ natureDurable: true, ligne: ligne(ht) });
    expect(motifsNature(durable(50000))).toEqual(['immobilisation_probable']);
    expect(motifsNature(durable(50001))).toEqual(['immobilisation_probable']);
    expect(motifsNature(durable(49999))).toEqual([]);
    expect(regleCCK12.evaluer(durable(50000))).toEqual({ resultat: 'ALERTE', valeur: 'immobilisation_probable' });
    expect(regleCCK12.evaluer(durable(49999))).toEqual({ resultat: 'OK' });
    // Durable déjà proposée en immobilisation : pas de motif.
    expect(motifsNature(avec({ natureDurable: true, comptepropose: '218300', ligne: ligne(90000) }))).toEqual([]);
  });

  it('nature-non-durable-sans-motif', () => {
    const o = avec({ ligne: ligne(900000), seuilImmobilisation: undefined });
    expect(motifsNature(o)).toEqual([]);
    expect(regleCCK12.evaluer(o)).toEqual({ resultat: 'OK' });
    expect(motifsNature(avec({ prefixesCharge: [], prefixesImmobilisation: [], comptesDepot: [], naturesHorsActivite: [] }))).toEqual([]);
  });

  it('immobilisation-sur-charge', () => {
    const o = avec({ comptepropose: '218300' });
    expect(motifsNature(o)).toEqual(['immobilisation_sur_charge']);
    expect(regleCCK12.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'immobilisation_sur_charge' });
    expect(motifsNature({ ...o, natureDurable: true })).toEqual([]);
  });

  it('hors-activite', () => {
    const o = avec({ ligne: ligne(1000, 'voyage') });
    expect(motifsNature(o)).toEqual(['hors_activite']);
    expect(regleCCK12.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'hors_activite' });
    // Plusieurs motifs : triés et joints par |.
    const deux = avec({ ligne: ligne(1000, 'voyage'), natureCaution: true, comptepropose: '613200' });
    expect(regleCCK12.evaluer(deux)).toEqual({ resultat: 'ALERTE', valeur: 'caution_en_charge|hors_activite' });
  });

  it('habitude-differente-mineure', () => {
    const o = avec({ natureHabituelle: 'loyer' });
    expect(regleCCK12H.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'fournitures' });
    expect(regleCCK12H.evaluer(avec({ natureHabituelle: 'fournitures' }))).toEqual({ resultat: 'OK' });
    expect(regleCCK12.evaluer(o)).toEqual({ resultat: 'OK' });
  });

  it('sans-habitude-ok', () => {
    expect(regleCCK12H.evaluer(base)).toEqual({ resultat: 'OK' });
  });

  it('seuil-absent-impossible', () => {
    const o = avec({ natureDurable: true, seuilImmobilisation: undefined });
    expect(() => motifsNature(o)).toThrow('parametre_absent');
    const traces = executerControles([regleCCK12], [{ type: 'ligne', id: 'L1', donnee: o }], 'arrivee', 'h');
    expect(traces[0]?.resultat).toBe('IMPOSSIBLE');
    // Montants invalides : exception codée.
    for (const ht of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      expect(() => motifsNature(avec({ ligne: ligne(ht) }))).toThrow();
    }
    for (const s of [Number.NaN, 1.5, -1]) {
      expect(() => motifsNature(avec({ natureDurable: true, seuilImmobilisation: c(s) }))).toThrow();
    }
  });
});
