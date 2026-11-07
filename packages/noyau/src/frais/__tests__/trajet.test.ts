import { describe, expect, it } from 'vitest';
import { admissibilite, kmRetenus, lireKmDixiemes } from '../trajet.js';
import type { Trajet, Vehicule } from '../types.js';

const trajet = (p: Partial<Trajet> = {}): Trajet => ({
  fraisId: 'f1',
  vehiculeId: 'v1',
  depart: 'Atelier',
  arrivee: 'Chez Dupont-Exemple',
  motif: 'Visite client',
  kmSaisisDixiemes: 125,
  allerRetour: false,
  ...p,
});
const vehicule = (p: { [K in keyof Vehicule]?: Vehicule[K] | undefined } = {}): Vehicule => ({
  id: 'v1',
  personneId: 'p1',
  puissanceCv: 5,
  energie: 'thermique',
  proprietaire: 'personne',
  categorie: 'voiture',
  carteGrisePieceId: 'cg1',
  ...(p as Partial<Vehicule>),
});
const invalide = { code: 'entree_invalide' };

describe('trajet', () => {
  it('km-entiers-et-dixiemes', () => {
    const cas: [string, number][] = [
      ['120', 1200],
      ['12,5', 125],
      ['12.5', 125],
      ['0,5', 5],
      ['007', 70],
    ];
    for (const [texte, attendu] of cas) expect(lireKmDixiemes(texte)).toBe(attendu);
  });

  it('km-mal-formes-refuses', () => {
    const cas = ['', '0', '0,0', '-3', '1e2', 'NaN', 'Infinity', '12,55', '12,', ',5', '1,2,3', ' 12', '1 2', '٣', '9'.repeat(20)];
    for (const texte of cas) expect(() => lireKmDixiemes(texte), texte).toThrow(expect.objectContaining(invalide));
  });

  it('aller-retour-double', () => {
    expect(kmRetenus(trajet())).toBe(125);
    expect(kmRetenus(trajet({ allerRetour: true }))).toBe(250);
    for (const km of [0, -5, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => kmRetenus(trajet({ kmSaisisDixiemes: km }))).toThrow(expect.objectContaining(invalide));
    }
    expect(() => kmRetenus(trajet({ kmSaisisDixiemes: Number.MAX_SAFE_INTEGER, allerRetour: true }))).toThrow(
      expect.objectContaining(invalide),
    );
  });

  it('nf13-vehicule-societe-refuse', () => {
    expect(admissibilite(trajet(), vehicule({ proprietaire: 'societe' }))).toEqual({
      etat: 'refuse',
      code: 'vehicule_societe',
    });
  });

  it('location-a-verifier', () => {
    expect(admissibilite(trajet(), vehicule({ proprietaire: 'location' }))).toEqual({
      etat: 'a_verifier',
      raison: 'location',
    });
  });

  it('conjoint-a-verifier', () => {
    expect(admissibilite(trajet(), vehicule({ proprietaire: 'conjoint' }))).toEqual({
      etat: 'a_verifier',
      raison: 'conjoint',
    });
  });

  it('deux-roues-refuse', () => {
    expect(admissibilite(trajet(), vehicule({ categorie: 'deux_roues' }))).toEqual({
      etat: 'refuse',
      code: 'deux_roues_non_pris_en_charge',
    });
  });

  it('carte-grise-absente-a-completer', () => {
    expect(admissibilite(trajet(), vehicule())).toEqual({ etat: 'calculable' });
    for (const cg of [undefined, '', '  ']) {
      expect(admissibilite(trajet(), vehicule({ carteGrisePieceId: cg }))).toEqual({
        etat: 'a_completer',
        manque: ['carte_grise'],
      });
    }
    expect(admissibilite(trajet({ motif: ' ' }), vehicule({ carteGrisePieceId: undefined }))).toEqual({
      etat: 'a_completer',
      manque: ['carte_grise', 'motif'],
    });
  });

  it('depart-ou-arrivee-vide-a-completer', () => {
    for (const p of [{ depart: '' }, { arrivee: '  ' }]) {
      expect(admissibilite(trajet(p), vehicule())).toEqual({ etat: 'a_completer', manque: ['depart_arrivee'] });
    }
  });

  it('ordre-refus-avant-a-completer', () => {
    const vide = trajet({ depart: '', motif: '' });
    expect(admissibilite(vide, vehicule({ proprietaire: 'societe', carteGrisePieceId: undefined }))).toEqual({
      etat: 'refuse',
      code: 'vehicule_societe',
    });
    expect(admissibilite(vide, vehicule({ proprietaire: 'location', carteGrisePieceId: undefined }))).toEqual({
      etat: 'a_verifier',
      raison: 'location',
    });
    expect(() => admissibilite(trajet({ vehiculeId: 'autre' }), vehicule())).toThrow(expect.objectContaining(invalide));
  });
});
