import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { LigneBanqueSociete } from '../correspondance-banque.js';
import { determinerPayeur } from '../payeur.js';
import { ErreurFrais } from '../types.js';

type Entree = Parameters<typeof determinerPayeur>[0];
const ligne = (id: string, date = '2026-03-11', montant = 4590): LigneBanqueSociete => ({
  id,
  date,
  montant: centimes(montant),
  sens: 'debit',
  libelle: 'CB Librairie Mistral',
  compte: 'cpt-1',
});
const base = (extra: Partial<Entree> = {}): Entree => ({
  ticket: { montantTtc: centimes(4590), date: '2026-03-10', fournisseur: 'Librairie Mistral' },
  lignes: [],
  cartesSociete: ['4821'],
  releveImporte: false,
  fenetreJours: 3,
  ...extra,
});
const ticketAvec = (extra: object): Entree['ticket'] => ({ ...base().ticket, ...extra });

describe('determinerPayeur', () => {
  it('nf02-banque-fait-foi : une ligne de debit correspond, la premiere rendue gagne', () => {
    const r = determinerPayeur(base({ lignes: [ligne('L2', '2026-03-12'), ligne('L1', '2026-03-11')], releveImporte: true }));
    expect(r).toEqual({ payeur: 'societe', source: 'banque', statut: 'exclu_paye_societe', regle: 1, conflit: false, ligneBanqueId: 'L1' });
  });

  it('nf03-conflit-banque-gagne : la personne declare, la banque correspond', () => {
    const r = determinerPayeur(base({ declaration: 'personne', lignes: [ligne('L1')] }));
    expect(r).toMatchObject({ payeur: 'societe', source: 'banque', statut: 'exclu_paye_societe', regle: 1, conflit: true });
    expect(determinerPayeur(base({ declaration: 'societe', lignes: [ligne('L1')] })).conflit).toBe(false);
  });

  it('nf04-carte-connue-releve-absent : societe suppose, a completer', () => {
    const r = determinerPayeur(base({ ticket: ticketAvec({ quatreChiffres: '4821' }) }));
    expect(r).toEqual({ payeur: 'societe', statut: 'a_completer', regle: 2, conflit: false, attente: 'releve_manquant' });
    const inconnue = determinerPayeur(base({ ticket: ticketAvec({ quatreChiffres: '9999' }) }));
    expect(inconnue).toMatchObject({ payeur: 'a_confirmer', regle: 4, question: 'qui_a_paye' });
    const importe = determinerPayeur(base({ ticket: ticketAvec({ quatreChiffres: '4821' }), releveImporte: true }));
    expect(importe).toMatchObject({ payeur: 'a_confirmer', regle: 4, question: 'qui_a_paye' });
    const personne = determinerPayeur(base({ ticket: ticketAvec({ quatreChiffres: '4821' }), releveImporte: true, declaration: 'personne' }));
    expect(personne).toMatchObject({ payeur: 'personne', regle: 3 });
  });

  it('nf05-releve-manquant-en-attente : une declaration reste a completer', () => {
    const personne = determinerPayeur(base({ declaration: 'personne' }));
    expect(personne).toEqual({ payeur: 'a_confirmer', statut: 'a_completer', regle: 4, conflit: false, attente: 'releve_manquant' });
    const societe = determinerPayeur(base({ declaration: 'societe' }));
    expect(societe).toEqual({ payeur: 'societe', source: 'declaration', statut: 'a_completer', regle: 3, conflit: false, attente: 'releve_manquant' });
  });

  it('nf06-sans-indice-question : a confirmer, question posee', () => {
    const attendu = { payeur: 'a_confirmer', statut: 'a_completer', regle: 4, conflit: false, question: 'qui_a_paye' };
    expect(determinerPayeur(base())).toEqual(attendu);
    expect(determinerPayeur(base({ releveImporte: true }))).toEqual(attendu);
    expect(determinerPayeur(base({ releveImporte: true, lignes: [ligne('L9', '2026-03-20'), ligne('L8', '2026-03-11', 4591)] }))).toEqual(attendu);
  });

  it('declaration-et-releve-sans-ligne-personne : personne, source declaration', () => {
    const r = determinerPayeur(base({ declaration: 'personne', releveImporte: true, lignes: [ligne('L9', '2026-03-20')] }));
    expect(r).toEqual({ payeur: 'personne', source: 'declaration', statut: 'propose', regle: 3, conflit: false });
    const societe = determinerPayeur(base({ declaration: 'societe', releveImporte: true }));
    expect(societe).toEqual({ payeur: 'societe', source: 'declaration', statut: 'a_completer', regle: 3, conflit: false });
  });

  it('ia-seule-ne-decide-pas : la suggestion ne devient jamais le payeur', () => {
    for (const proposeParIa of ['personne', 'societe'] as const) {
      for (const releveImporte of [false, true]) {
        const r = determinerPayeur(base({ proposeParIa, releveImporte }));
        expect(r).toMatchObject({ payeur: 'a_confirmer', regle: 4, question: 'qui_a_paye', suggestion: proposeParIa });
        expect(r.source).toBeUndefined();
      }
    }
    expect(determinerPayeur(base()).suggestion).toBeUndefined();
    expect(determinerPayeur(base({ proposeParIa: 'a_confirmer' })).suggestion).toBeUndefined();
    expect(determinerPayeur(base({ proposeParIa: 'personne', lignes: [ligne('L1')] })).suggestion).toBeUndefined();
  });

  it('quatre-chiffres-mal-formes-ignores : jamais accepte, jamais d erreur', () => {
    const cartes = ['482', '48211', 'abcd', ' 4821', '4821 '];
    for (const quatreChiffres of ['482', '48211', 'abcd', ' 4821', '4821 ', '']) {
      const r = determinerPayeur(base({ cartesSociete: cartes, ticket: ticketAvec({ quatreChiffres }) }));
      expect(r).toMatchObject({ payeur: 'a_confirmer', regle: 4 });
    }
    expect(determinerPayeur(base({ cartesSociete: ['4821'], ticket: ticketAvec({ quatreChiffres: '4821' }) })).regle).toBe(2);
  });

  it('ordre-des-regles : ligne de banque, carte connue et declaration : regle 1', () => {
    const r = determinerPayeur(base({ lignes: [ligne('L1')], ticket: ticketAvec({ quatreChiffres: '4821' }), declaration: 'personne', releveImporte: true }));
    expect(r).toMatchObject({ regle: 1, payeur: 'societe', conflit: true, ligneBanqueId: 'L1' });
  });

  it('la fenetre de jours est celle de l appelant', () => {
    const lignes = [ligne('L1', '2026-03-12')];
    expect(determinerPayeur(base({ lignes, fenetreJours: 1 })).regle).toBe(4);
    expect(determinerPayeur(base({ lignes, fenetreJours: 2 })).regle).toBe(1);
  });

  it('entrees-invalides : entree_invalide, jamais un resultat', () => {
    const invalides: Partial<Entree>[] = [
      { fenetreJours: Number.NaN },
      { fenetreJours: Number.POSITIVE_INFINITY },
      { fenetreJours: -1 },
      { fenetreJours: 1.5 },
      { ticket: ticketAvec({ montantTtc: 45.9 }) },
      { ticket: ticketAvec({ montantTtc: Number.NaN }) },
      { ticket: ticketAvec({ date: '2026-02-30' }) },
      { cartesSociete: undefined as never },
      { releveImporte: 'oui' as never },
      { lignes: [ligne('L1', 'hier')] },
    ];
    for (const extra of invalides) {
      expect(() => determinerPayeur(base(extra))).toThrow(ErreurFrais);
      try {
        determinerPayeur(base(extra));
      } catch (e) {
        expect((e as ErreurFrais).code).toBe('entree_invalide');
      }
    }
  });
});
