import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import * as T from '../types.js';

const COPIES: Record<string, { liste: readonly string[]; copie: string[] }> = {
  NIVEAUX: { liste: T.NIVEAUX, copie: ['L', 'B', 'M', 'I'] },
  CANAUX: { liste: T.CANAUX, copie: ['clavier', 'voix'] },
  ISSUES: {
    liste: T.ISSUES,
    copie: ['reponse', 'action_proposee', 'navigation', 'question', 'refus_utile', 'escalade'],
  },
  TYPES_EVENEMENT: {
    liste: T.TYPES_EVENEMENT,
    copie: ['tour.debut', 'etape', 'texte', 'carte', 'proposition', 'question', 'erreur', 'tour.fin'],
  },
  TYPES_CARTE: {
    liste: T.TYPES_CARTE,
    copie: ['ecriture', 'piece', 'liste', 'proposition', 'rapprochement', 'tva', 'telechargement'],
  },
  CODES_ERREUR: {
    liste: T.CODES_ERREUR,
    copie: [
      'parametre_invalide', 'outil_hors_liste', 'hors_schema', 'trop_de_demandes', 'budget_tour_atteint',
      'budget_plan_atteint', 'ia_indisponible', 'proposition_inconnue', 'proposition_expiree',
      'acteur_non_humain', 'droit_insuffisant', 'periode_cloturee', 'ecriture_validee',
      'annulation_expiree', 'volume_trop_grand', 'niveau_ferme',
    ],
  },
  MOTIFS_REFUS: {
    liste: T.MOTIFS_REFUS,
    copie: [
      'ecriture_validee', 'periode_cloturee', 'geste_irreversible_requis', 'suppression_definitive',
      'facture_hors_produit', 'consignes_confidentielles', 'autre_societe',
    ],
  },
  ETATS_PROPOSITION: {
    liste: T.ETATS_PROPOSITION,
    copie: ['proposee', 'appliquee', 'annulee', 'expiree', 'refusee'],
  },
  ACTEURS: { liste: T.ACTEURS, copie: ['personne', 'compte_service', 'agent', 'modele', 'systeme'] },
  ORIGINES: { liste: T.ORIGINES, copie: ['personne', 'piece', 'outil'] },
  CONFIANCES: { liste: T.CONFIANCES, copie: ['sur', 'a_verifier', 'douteux'] },
  SOURCES_PROPOSITION: {
    liste: T.SOURCES_PROPOSITION,
    copie: ['regle_societe', 'historique', 'ia_exemples', 'ia_seule'],
  },
  ISSUES_APPEL_IA: {
    liste: T.ISSUES_APPEL_IA,
    copie: ['ok', 'secours', 'refus_gardien', 'hors_schema', 'arret'],
  },
  ETAPES_PIECE: {
    liste: T.ETAPES_PIECE,
    copie: ['recue', 'lue_a', 'lue_b', 'comparee', 'classee', 'tva_qualifiee', 'controlee', 'proposition_prete'],
  },
  SORTIES_PIECE: {
    liste: T.SORTIES_PIECE,
    copie: ['a_verifier', 'desaccord', 'en_attente', 'refusee'],
  },
  POLES: { liste: T.POLES, copie: ['comptabilite', 'fiscalite', 'juridique', 'rgpd_securite'] },
  STATUTS_CONSTAT: { liste: T.STATUTS_CONSTAT, copie: ['ouvert', 'explique', 'corrige', 'accepte'] },
  GRAVITES_CONSTAT: { liste: T.GRAVITES_CONSTAT, copie: ['critique', 'majeur', 'mineur', 'info'] },
};

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return (e as T.ErreurChat).code;
  }
  return undefined;
}

describe('types du chat', () => {
  it('listes-sans-doublon', () => {
    for (const { liste } of Object.values(COPIES)) expect(new Set(liste).size).toBe(liste.length);
  });
  it('listes-figees', () => {
    for (const [nom, { liste, copie }] of Object.entries(COPIES)) expect([nom, liste]).toEqual([nom, copie]);
  });
  it('seize-codes-erreur', () => expect(T.CODES_ERREUR).toHaveLength(16));
  it('six-issues', () => expect(T.ISSUES).toHaveLength(6));
  it('sept-cartes', () => expect(T.TYPES_CARTE).toHaveLength(7));
  it('micro-centimes-entier', () => {
    expect(T.microCentimes(0)).toBe(0);
    expect(T.microCentimes(12)).toBe(12);
    expect(T.microCentimes(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('micro-centimes-disjoint-de-centimes', () => {
    // @ts-expect-error MicroCentimes ne doit pas être assignable à Centimes.
    const c: Centimes = T.microCentimes(1);
    expect(c).toBe(1);
  });
  it('micro-centimes-refuse', () => {
    for (const v of [-1, 1.5, Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(code(() => T.microCentimes(v))).toBe('montant_invalide');
    }
    // Choix : -0 est accepté et normalisé en +0.
    expect(Object.is(T.microCentimes(-0), 0)).toBe(true);
  });
  it('est-dans-refuse-inconnu', () => {
    expect(T.estDans(T.NIVEAUX, 'L')).toBe(true);
    for (const v of ['', 'l', 'L ', ' L', 'X', 1, null, undefined]) expect(T.estDans(T.NIVEAUX, v)).toBe(false);
    expect(T.estDans(T.ISSUES, 'Reponse')).toBe(false);
    expect(T.estDans(T.ISSUES, 'reponse ')).toBe(false);
  });
  it('erreur-chat-porte-son-code', () => {
    const e = new T.ErreurChat('niveau_ferme');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('niveau_ferme');
    expect(e.name).toBe('ErreurChat');
    expect(e.message).toBe('niveau_ferme');
  });
});
