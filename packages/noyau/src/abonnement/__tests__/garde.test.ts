import { describe, expect, it } from 'vitest';
import { autoriser, envoiPermis } from '../garde.js';
import type { ClasseAction, EtatAcces, EtatVoulu } from '../types.js';

const P = { permis: true };
const R = { permis: false, code: 'etat_acces', raison: 'etat' };
// Matrice écrite à la main : [état, lecture, export, ecriture, agent, compte]
const MATRICE: [EtatAcces, ClasseAction, boolean][] = [
  ['ESSAI', 'lecture', true], ['ESSAI', 'export', true], ['ESSAI', 'ecriture', true], ['ESSAI', 'agent', true], ['ESSAI', 'compte', true],
  ['ACTIF', 'lecture', true], ['ACTIF', 'export', true], ['ACTIF', 'ecriture', true], ['ACTIF', 'agent', true], ['ACTIF', 'compte', true],
  ['DELAI_DE_GRACE', 'lecture', true], ['DELAI_DE_GRACE', 'export', true], ['DELAI_DE_GRACE', 'ecriture', true], ['DELAI_DE_GRACE', 'agent', true], ['DELAI_DE_GRACE', 'compte', true],
  ['LECTURE_SEULE', 'lecture', true], ['LECTURE_SEULE', 'export', true], ['LECTURE_SEULE', 'ecriture', false], ['LECTURE_SEULE', 'agent', false], ['LECTURE_SEULE', 'compte', true],
  ['SUSPENDU', 'lecture', true], ['SUSPENDU', 'export', true], ['SUSPENDU', 'ecriture', false], ['SUSPENDU', 'agent', false], ['SUSPENDU', 'compte', true],
  ['RESILIE', 'lecture', true], ['RESILIE', 'export', true], ['RESILIE', 'ecriture', false], ['RESILIE', 'agent', false], ['RESILIE', 'compte', true],
];
const ETATS: EtatAcces[] = ['ESSAI', 'ACTIF', 'DELAI_DE_GRACE', 'LECTURE_SEULE', 'SUSPENDU', 'RESILIE'];
const voulu = (v: unknown): EtatVoulu => ({ etat: 'actif', version: 1, arretEnvois: v as boolean });

describe('garde par classe d action', () => {
  it('matrice-six-etats-cinq-classes', () => {
    expect(MATRICE).toHaveLength(30);
    for (const [etat, classe, attendu] of MATRICE) {
      expect(autoriser(etat, classe), `${etat}/${classe}`).toEqual(attendu ? P : R);
    }
  });

  it('export-toujours-permis', () => {
    let reussis = 0;
    for (let i = 0; i < 12; i += 1) {
      if (autoriser(ETATS[i % 6] as EtatAcces, 'export', 'x', []).permis) reussis += 1;
    }
    expect(reussis).toBe(12);
  });

  it('fonction-absente-refusee', () => {
    const refus = { permis: false, code: 'etat_acces', raison: 'fonction_non_permise' };
    for (const classe of ['lecture', 'ecriture', 'agent'] as const) {
      expect(autoriser('ACTIF', classe, 'ventes', ['achats'])).toEqual(refus);
      expect(autoriser('ACTIF', classe, 'achats', ['achats'])).toEqual(P);
    }
    expect(autoriser('LECTURE_SEULE', 'ecriture', 'achats', ['achats'])).toEqual(R);
  });

  it('droits-usage-vide-n-empeche-pas-export', () => {
    expect(autoriser('ACTIF', 'export', 'ventes', [])).toEqual(P);
    expect(autoriser('RESILIE', 'compte', 'ventes', [])).toEqual(P);
    expect(autoriser('ACTIF', 'lecture', 'ventes', [])).toMatchObject({ permis: false, raison: 'fonction_non_permise' });
  });

  it('droits-usage-indefini-sans-borne', () => {
    expect(autoriser('ACTIF', 'agent', 'inconnue')).toEqual(P);
    expect(autoriser('ACTIF', 'lecture', 'inconnue', undefined)).toEqual(P);
    expect(autoriser('ACTIF', 'lecture', undefined, [])).toEqual(P);
  });

  it('arret-envois-bloque-tout-envoi', () => {
    expect(envoiPermis(voulu(false))).toBe(true);
    expect(envoiPermis(voulu(true))).toBe(false);
    expect(envoiPermis(voulu(undefined))).toBe(false);
    expect(envoiPermis(voulu('false'))).toBe(false);
    expect(envoiPermis(voulu(0))).toBe(false);
    expect(envoiPermis(voulu(null))).toBe(false);
  });

  it('valeur-inconnue-refusee', () => {
    const inconnu = { permis: false, code: 'etat_acces', raison: 'valeur_inconnue' };
    expect(autoriser('ACTIF', 'ECRITURE' as ClasseAction)).toEqual(inconnu);
    expect(autoriser('' as EtatAcces, 'lecture')).toEqual(inconnu);
    expect(autoriser('' as EtatAcces, 'export')).toEqual(inconnu);
    expect(autoriser('ACTIF', 'toString' as ClasseAction)).toEqual(inconnu);
    expect(autoriser('constructor' as EtatAcces, 'lecture')).toEqual(inconnu);
  });
});
