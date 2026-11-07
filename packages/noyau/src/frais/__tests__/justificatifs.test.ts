import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { manquants, peutEtreValide } from '../justificatifs.js';
import type { Frais, Trajet, Vehicule } from '../types.js';

type Souple<T> = { [K in keyof T]?: T[K] | undefined };
const f = (o: Souple<Frais> = {}): Frais =>
  ({
  id: 'f1',
  personneId: 'p1',
  nature: 'depense',
  dateDepense: '2026-03-02',
  libelle: 'Repas fictif',
  montantTtc: centimes(1200),
  tva: centimes(200),
  pieceId: 'pc1',
  payeur: 'personne',
  statut: 'brouillon',
  justificatifPerdu: false,
  partPersoTtc: centimes(0),
  version: 1,
  ...o,
  }) as Frais;
const trajet = (o: Souple<Trajet> = {}): Trajet => ({ fraisId: 'f1', vehiculeId: 'v1', depart: 'Lille', arrivee: 'Arras', motif: 'Rendez-vous client', kmSaisisDixiemes: 520, allerRetour: false, ...o }) as Trajet;
const vehicule = (o: Souple<Vehicule> = {}): Vehicule => ({ id: 'v1', personneId: 'p1', puissanceCv: 5, energie: 'thermique', proprietaire: 'personne', categorie: 'voiture', carteGrisePieceId: 'cg1', ...o }) as Vehicule;
const tr = f({ nature: 'trajet', pieceId: undefined });
const code = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const perdu = (o: Souple<Frais> = {}) => f({ pieceId: undefined, justificatifPerdu: true, motifSansJustificatif: 'Ticket perdu en route', ...o });
const habilite = { roleHabilite: true };

describe('justificatifs frais', () => {
  it('depense-sans-piece-a-completer', () => {
    expect(manquants(f({ pieceId: undefined }), {})).toEqual(['justificatif']);
    expect(manquants(f({ pieceId: '' }), {})).toEqual(['justificatif']);
    expect(manquants(f(), {})).toEqual([]);
    expect(peutEtreValide(f({ pieceId: undefined }), {}, habilite)).toEqual({ ok: false, code: 'justificatif_manquant' });
    expect(peutEtreValide(f(), {}, { roleHabilite: false })).toEqual({ ok: true, tvaForceeAZero: false });
  });

  it('nf14-perdu-avec-motif-tva-zero', () => {
    expect(manquants(perdu(), {})).toEqual([]);
    expect(peutEtreValide(perdu(), {}, habilite)).toEqual({ ok: true, tvaForceeAZero: true, motifEcriture: 'Ticket perdu en route' });
    expect(peutEtreValide(perdu({ motifSansJustificatif: '  Ticket perdu  ' }), {}, habilite)).toEqual({ ok: true, tvaForceeAZero: true, motifEcriture: 'Ticket perdu' });
    const m200 = 'm'.repeat(200);
    expect(peutEtreValide(perdu({ motifSansJustificatif: m200 }), {}, habilite)).toMatchObject({ ok: true, motifEcriture: m200 });
    expect(peutEtreValide(perdu({ motifSansJustificatif: 'x' }), {}, habilite)).toMatchObject({ ok: true, motifEcriture: 'x' });
    expect(code(() => peutEtreValide(perdu({ motifSansJustificatif: 'm'.repeat(201) }), {}, habilite))).toBe('entree_invalide');
    expect(code(() => manquants(perdu({ motifSansJustificatif: 'm'.repeat(201) }), {}))).toBe('entree_invalide');
  });

  it('nf14-perdu-sans-motif-refuse', () => {
    expect(manquants(perdu({ motifSansJustificatif: undefined }), {})).toEqual(['motif_perte']);
    expect(peutEtreValide(perdu({ motifSansJustificatif: undefined }), {}, habilite)).toEqual({ ok: false, code: 'motif_obligatoire' });
    expect(peutEtreValide(perdu({ motifSansJustificatif: '' }), {}, habilite)).toEqual({ ok: false, code: 'motif_obligatoire' });
  });

  it('perdu-sans-role-habilite-refuse', () => {
    expect(peutEtreValide(perdu(), {}, { roleHabilite: false })).toEqual({ ok: false, code: 'justificatif_manquant' });
    expect(peutEtreValide(perdu({ motifSansJustificatif: '' }), {}, { roleHabilite: false })).toEqual({ ok: false, code: 'justificatif_manquant' });
  });

  it('motif-espaces-seulement-refuse', () => {
    for (const motifSansJustificatif of ['   ', '\t\n ']) {
      expect(manquants(perdu({ motifSansJustificatif }), {})).toEqual(['motif_perte']);
      expect(peutEtreValide(perdu({ motifSansJustificatif }), {}, habilite)).toEqual({ ok: false, code: 'motif_obligatoire' });
    }
  });

  it('trajet-sans-carte-grise', () => {
    expect(manquants(tr, { trajet: trajet(), vehicule: vehicule({ carteGrisePieceId: undefined }) })).toEqual(['carte_grise']);
    expect(manquants(tr, { trajet: trajet(), vehicule: vehicule({ carteGrisePieceId: '' }) })).toEqual(['carte_grise']);
    expect(manquants(tr, { trajet: trajet(), vehicule: vehicule() })).toEqual([]);
    expect(manquants(tr, { trajet: trajet() })).toEqual(['vehicule']);
    expect(manquants(tr, { trajet: trajet({ vehiculeId: 'v9' }), vehicule: vehicule() })).toEqual(['vehicule']);
    expect(manquants(tr, {})).toEqual(['motif_trajet', 'depart_arrivee', 'vehicule']);
    expect(peutEtreValide(tr, { trajet: trajet(), vehicule: vehicule({ carteGrisePieceId: undefined }) }, habilite)).toEqual({ ok: false, code: 'justificatif_manquant' });
    expect(peutEtreValide(tr, { trajet: trajet(), vehicule: vehicule() }, habilite)).toEqual({ ok: true, tvaForceeAZero: false });
  });

  it('trajet-sans-motif', () => {
    const v = vehicule();
    expect(manquants(tr, { trajet: trajet({ motif: ' ' }), vehicule: v })).toEqual(['motif_trajet']);
    expect(manquants(tr, { trajet: trajet({ depart: '' }), vehicule: v })).toEqual(['depart_arrivee']);
    expect(manquants(tr, { trajet: trajet({ arrivee: '  ' }), vehicule: v })).toEqual(['depart_arrivee']);
    expect(peutEtreValide(tr, { trajet: trajet({ motif: '' }), vehicule: v }, habilite)).toEqual({ ok: false, code: 'motif_obligatoire' });
    expect(peutEtreValide(tr, { trajet: trajet({ depart: '' }), vehicule: v }, habilite)).toEqual({ ok: false, code: 'justificatif_manquant' });
    for (const km of [0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => manquants(tr, { trajet: trajet({ kmSaisisDixiemes: km }), vehicule: v }))).toBe('entree_invalide');
    }
  });

  it('lecture-incertaine-sans-estimation', () => {
    expect(manquants(f(), { lectureIncertaine: true })).toEqual(['montant_illisible', 'date_illisible']);
    expect(manquants(f(), { lectureIncertaine: { montant: true } })).toEqual(['montant_illisible']);
    expect(manquants(f(), { lectureIncertaine: { date: true } })).toEqual(['date_illisible']);
    expect(manquants(f(), { lectureIncertaine: { date: false, montant: false } })).toEqual([]);
    expect(manquants(f(), { lectureIncertaine: false })).toEqual([]);
    expect(peutEtreValide(f(), { lectureIncertaine: true }, habilite)).toEqual({ ok: false, code: 'justificatif_manquant' });
    expect(peutEtreValide(perdu(), { lectureIncertaine: { date: true } }, habilite)).toEqual({ ok: false, code: 'justificatif_manquant' });
  });

  it('ordre-des-manquants-stable', () => {
    const t = f({ nature: 'trajet', pieceId: undefined });
    const ctx = { trajet: trajet({ motif: '', depart: '' }), vehicule: vehicule({ carteGrisePieceId: undefined }), lectureIncertaine: true };
    const attendu = ['motif_trajet', 'depart_arrivee', 'carte_grise', 'montant_illisible', 'date_illisible'];
    expect(manquants(t, ctx)).toEqual(attendu);
    expect(manquants(t, ctx)).toEqual(attendu);
    expect(manquants(f({ pieceId: undefined }), { lectureIncertaine: true })).toEqual(['justificatif', 'montant_illisible', 'date_illisible']);
    expect(manquants(perdu({ motifSansJustificatif: '' }), { lectureIncertaine: true })).toEqual(['motif_perte', 'montant_illisible', 'date_illisible']);
    expect(code(() => manquants({} as Frais, {}))).toBe('entree_invalide');
    expect(code(() => peutEtreValide({} as Frais, {}, habilite))).toBe('entree_invalide');
  });
});
