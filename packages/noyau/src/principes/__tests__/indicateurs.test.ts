import { describe, expect, it } from 'vitest';
import { ErreurIndicateur, croissancePointsDeBase, disponibilite, indicateurDepuis } from '../indicateurs.js';

const vide = { etat: 'vide', valeur: null, raison: 'aucune_donnee' };
const manquant = { etat: 'donnee_manquante', valeur: null, raison: 'donnee_absente' };
const sansPoint = { etat: 'donnee_manquante', valeur: null, raison: 'pas_de_point_de_comparaison' };

describe('indicateurs', () => {
  it('aucune-vente-vide-pas-zero', () => {
    expect(indicateurDepuis({ nbElements: 0, valeur: 0 })).toEqual(vide);
    expect(indicateurDepuis({ nbElements: 0, valeur: null })).toEqual(vide);
    expect(indicateurDepuis({ nbElements: 3, valeur: 0 })).toEqual({ etat: 'ok', valeur: 0 });
    expect(indicateurDepuis({ nbElements: 2, valeur: 4200 })).toEqual({ etat: 'ok', valeur: 4200 });
  });

  it('donnee-absente', () => {
    expect(indicateurDepuis({ nbElements: 5, valeur: null })).toEqual(manquant);
    expect(indicateurDepuis({ nbElements: 5, valeur: undefined })).toEqual(manquant);
  });

  it('croissance-sans-exercice-precedent', () => {
    expect(croissancePointsDeBase(100000, 0)).toEqual(sansPoint);
    expect(croissancePointsDeBase(100000, null)).toEqual(sansPoint);
    expect(croissancePointsDeBase(100000, undefined)).toEqual(sansPoint);
    expect(croissancePointsDeBase(100000, -5)).toEqual(sansPoint);
  });

  it('croissance-calculee', () => {
    expect(croissancePointsDeBase(110000, 100000)).toEqual({ etat: 'ok', valeur: 1000 });
    expect(croissancePointsDeBase(100000, 100000)).toEqual({ etat: 'ok', valeur: 0 });
    expect(croissancePointsDeBase(100019, 100000)).toEqual({ etat: 'ok', valeur: 1 });
  });

  it('baisse-negative', () => {
    expect(croissancePointsDeBase(90000, 100000)).toEqual({ etat: 'ok', valeur: -1000 });
    // arrondi vers zéro, jamais de -0 ni de baisse surestimée
    expect(croissancePointsDeBase(99999, 100000)).toEqual({ etat: 'ok', valeur: 0 });
    expect(croissancePointsDeBase(99981, 100000)).toEqual({ etat: 'ok', valeur: -1 });
    expect(Object.is(croissancePointsDeBase(99999, 100000).valeur, 0)).toBe(true);
  });

  it('nan-infinity-donnee-manquante', () => {
    for (const v of [Number.NaN, Infinity, -Infinity]) {
      expect(indicateurDepuis({ nbElements: 4, valeur: v })).toEqual(manquant);
      expect(croissancePointsDeBase(v, 100000)).toEqual(manquant);
      expect(croissancePointsDeBase(100000, v)).toEqual(sansPoint);
    }
    expect(croissancePointsDeBase(null, 100000)).toEqual(manquant);
    // non entiers ou écart hors entiers sûrs : donnée absente, jamais d'exception
    expect(croissancePointsDeBase(100000.5, 100000)).toEqual(manquant);
    expect(croissancePointsDeBase(100000, 99999.5)).toEqual(manquant);
    expect(croissancePointsDeBase(Number.MAX_SAFE_INTEGER, 1)).toEqual(manquant);
    expect(croissancePointsDeBase(-Number.MAX_SAFE_INTEGER, 5)).toEqual(manquant);
    // nbElements invalide : donnée absente
    for (const n of [Number.NaN, Infinity, -1, 1.5]) {
      expect(indicateurDepuis({ nbElements: n, valeur: 5 })).toEqual(manquant);
    }
    expect(indicateurDepuis({ nbElements: 1, valeur: 5 })).toEqual({ etat: 'ok', valeur: 5 });
  });

  it('formation-declaration-apres-immatriculation', () => {
    const f = { statut: 'en_formation' } as const;
    expect(disponibilite('declaration', f)).toBe('apres_immatriculation');
    expect(disponibilite('fec_officiel', f)).toBe('apres_immatriculation');
    const i = { statut: 'immatriculee', siren: '123456782' } as const;
    expect(disponibilite('declaration', i)).toBe('disponible');
    expect(disponibilite('fec_officiel', i)).toBe('disponible');
    for (const siren of [undefined, '', '  ']) {
      let code: string | undefined;
      try {
        disponibilite('declaration', { statut: 'immatriculee', siren });
      } catch (e) {
        if (e instanceof ErreurIndicateur) code = e.code;
      }
      expect(code).toBe('siren_absent');
    }
  });

  it('formation-autres-ecrans-disponibles', () => {
    expect(disponibilite('autre', { statut: 'en_formation' })).toBe('disponible');
    expect(disponibilite('autre', { statut: 'immatriculee', siren: '123456782' })).toBe('disponible');
  });
});
