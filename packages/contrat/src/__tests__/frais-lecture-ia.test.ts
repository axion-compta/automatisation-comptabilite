import { describe, expect, it } from 'vitest';
import { creerFauxFournisseurLecture, creerServiceLectureIa, MENTION_IA } from '../domaines/frais-lecture-ia.js';

const SURE = { fournisseur: 'Café du Test', date: '2026-10-03', ttcCentimes: 2450, tvaParTaux: [{ tauxCentiemes: 1000, montantCentimes: 223 }], quatreChiffres: '4242', couverts: 2, confiance: 'sure' };
const INCERTAINE_COMPLETE = { ...SURE, confiance: 'incertaine' };
const INCERTAINE = { fournisseur: 'Café du Test', confiance: 'incertaine' };
const faux = (extra: { indisponible?: boolean } = {}) =>
  creerFauxFournisseurLecture({ tickets: { 'PIE-1': SURE, 'PIE-2': INCERTAINE, 'PIE-4': INCERTAINE_COMPLETE, 'PIE-3': { ...SURE, quatreChiffres: '9999' } }, distances: { 'Atelier Test>Chantier Test': 123 }, ...extra });

describe('lecture du ticket par l’IA (faux fournisseur, réponses enregistrées)', () => {
  it('lecture-sure-brouillon-rempli', async () => {
    const b = await creerServiceLectureIa(faux()).preparer('PIE-1');
    expect(b.statut).toBe('brouillon');
    expect(b.mention).toBe(MENTION_IA);
    expect(b.champs).toMatchObject({ fournisseur: 'Café du Test', date: '2026-10-03', ttcCentimes: 2450, couverts: 2 });
    expect(b.manquants).toEqual([]);
  });

  it('lecture-incertaine-a-completer', async () => {
    const b = await creerServiceLectureIa(faux()).preparer('PIE-2');
    expect(b.statut).toBe('a_completer');
    expect(b.manquants).toEqual(['date', 'ttcCentimes']);
    expect(b.champs.ttcCentimes).toBeUndefined();
    expect(b.champs.date).toBeUndefined();
  });

  it('lecture-incertaine-complete-a-completer', async () => {
    const b = await creerServiceLectureIa(faux()).preparer('PIE-4');
    expect(b.manquants).toEqual([]);
    expect(b.confiance).toBe('incertaine');
    expect(b.statut).toBe('a_completer');
  });

  it('quatre-chiffres-transmis', async () => {
    const b = await creerServiceLectureIa(faux()).preparer('PIE-1');
    expect(b.champs.quatreChiffres).toBe('4242');
    expect(b.payeur).toMatchObject({ payeur: 'societe', regle: 2 }); // carte société reconnue par determinerPayeur
  });

  it('ia-ne-fixe-pas-le-payeur', async () => {
    const b = await creerServiceLectureIa(faux()).preparer('PIE-3');
    expect(b.payeur).toEqual({ payeur: 'a_confirmer', regle: 4, question: 'qui_a_paye' });
    const vide = await creerServiceLectureIa(faux()).preparer('PIE-2');
    expect(vide.payeur.payeur).toBe('a_confirmer');
  });

  it('distance-proposee-non-retenue-sans-geste', async () => {
    const service = creerServiceLectureIa(faux());
    const b = await service.preparer('PIE-1', { depart: 'Atelier Test', arrivee: 'Chantier Test' });
    expect(b.distanceProposee).toEqual({ kmDixiemes: 123, mention: MENTION_IA, retenue: false });
    expect(b.champs.kmDixiemes).toBeUndefined();
    expect(service.retenirDistance(b).champs.kmDixiemes).toBe(123); // seul le geste de la personne la recopie
  });

  it('sans-depart-ni-arrivee-aucune-distance', async () => {
    const f = faux();
    const service = creerServiceLectureIa(f);
    for (const trajet of [undefined, { depart: 'Atelier Test' }, { arrivee: 'Chantier Test' }, { depart: '  ', arrivee: 'Chantier Test' }]) {
      expect((await service.preparer('PIE-1', trajet)).distanceProposee).toBeUndefined();
    }
    expect(f.appelsDistance).toBe(0);
    expect((await service.preparer('PIE-1', { depart: 'Ailleurs', arrivee: 'Nulle part' })).distanceProposee).toBeUndefined(); // distance inconnue : jamais inventée
  });

  it('distance-invalide-du-fournisseur-ignoree', async () => {
    for (const km of [-1, 12.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const f = creerFauxFournisseurLecture({ tickets: { 'PIE-1': SURE }, distances: { 'Atelier Test>Chantier Test': km } });
      const b = await creerServiceLectureIa(f).preparer('PIE-1', { depart: 'Atelier Test', arrivee: 'Chantier Test' });
      expect(b.distanceProposee).toBeUndefined();
    }
  });

  it('fournisseur-indisponible-brouillon-vide', async () => {
    const b = await creerServiceLectureIa(faux({ indisponible: true })).preparer('PIE-1', { depart: 'Atelier Test', arrivee: 'Chantier Test' });
    expect(b).toMatchObject({ statut: 'brouillon', fournisseurDisponible: false, champs: {}, mention: MENTION_IA });
    expect(b.distanceProposee).toBeUndefined();
  });
});
