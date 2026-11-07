import { describe, expect, it } from 'vitest';
import {
  ACCORDS,
  CANAUX,
  CHAMPS_SIMPLES,
  CODES_ERREUR,
  CODES_REFUS,
  ErreurPiece,
  ETATS_TRAITEMENT,
  estChampCritique,
  estDans,
  MOTIFS_A_VERIFIER,
  MOTIFS_MASQUAGE,
  MOTIFS_NON_COMPTEE,
  MOTIFS_SENSIBLE,
  MOTS_CONFIANCE,
  MOYENS_PAIEMENT,
  nomParTaux,
  SORTES_LIEN,
  SOURCES_CHAMP,
  STATUTS_PERIODE,
  TYPES_PIECE,
} from '../types.js';

// Copies écrites à la main : une liste modifiée dans types.ts fait échouer `listes-figees`.
const mots = (t: string): string[] => t.split(' ');
const COPIES: Record<string, { liste: readonly string[]; attendu: string[] }> = {
  TYPES_PIECE: { liste: TYPES_PIECE, attendu: mots('facture facture_acompte recu ticket avoir annulee reemise montant_zero releve_fournisseur non_piece plusieurs_factures facture_dans_corps inconnu') },
  ETATS_TRAITEMENT: { liste: ETATS_TRAITEMENT, attendu: mots('recue quarantaine preparee lue prete a_verifier refusee en_erreur en_attente_quota') },
  CANAUX: { liste: CANAUX, attendu: mots('glisser chat selecteur photo_mobile email plateforme_agreee api dossier_surveille portail_fournisseur') },
  MOTIFS_NON_COMPTEE: { liste: MOTIFS_NON_COMPTEE, attendu: mots('annulee montant_zero releve commande contrat reservation rappel devis autre plusieurs_factures doublon depot_errone inconnu a_verifier') },
  CODES_REFUS: { liste: CODES_REFUS, attendu: mots('type_refuse macro_refusee archive_refusee image_refusee trop_grand infecte destinataire_different') },
  CODES_ERREUR: { liste: CODES_ERREUR, attendu: mots('indetermine photo_floue ia_indisponible sortie_invalide plafond_cout quota_ia en_erreur integrite_ko controle_impossible') },
  MOTIFS_A_VERIFIER: { liste: MOTIFS_A_VERIFIER, attendu: mots('sortie_invalide plafond_cout ecart_arithmetique xml_invalide xml_different_du_visuel plusieurs_factures desaccord_type champ_douteux citation_introuvable origine_non_verifiee manuscrit client_facture_douteux taux_inconnu montant_hors_bornes pays_inconnu ttc_nul_ht_non_nul montant_du_non_qualifie fournisseur_inconnu ocr_trop_faible aucun_montant texte_cache collision_numeros') },
  MOTIFS_SENSIBLE: { liste: MOTIFS_SENSIBLE, attendu: mots('piece_identite nir sante_paie') },
  MOTIFS_MASQUAGE: { liste: MOTIFS_MASQUAGE, attendu: mots('nir carte_paiement iban secret') },
  SORTES_LIEN: { liste: SORTES_LIEN, attendu: mots('paiement_de avoir_de reemise_de acompte_de partie_de doublon_de') },
  SOURCES_CHAMP: { liste: SOURCES_CHAMP, attendu: mots('xml texte_pdf ocr vision modele') },
  ACCORDS: { liste: ACCORDS, attendu: mots('accord desaccord seul_a seul_b') },
  MOTS_CONFIANCE: { liste: MOTS_CONFIANCE, attendu: mots('sur a_verifier douteux') },
  MOYENS_PAIEMENT: { liste: MOYENS_PAIEMENT, attendu: mots('carte_societe autre_carte especes virement prelevement solde_prepaye mixte inconnu') },
  STATUTS_PERIODE: { liste: STATUTS_PERIODE, attendu: mots('avant_depot formation entre_immatriculation_et_exercice dans_exercice hors_exercice') },
  CHAMPS_SIMPLES: { liste: CHAMPS_SIMPLES, attendu: mots('fournisseur_nom fournisseur_siren fournisseur_tva fournisseur_adresse numero date_piece date_service_debut date_service_fin date_echeance devise ttc montant_du client_facture moyen_paiement type_piece langue') },
};

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurPiece ? e.code : 'autre_erreur';
  }
  return undefined;
}

describe('types des pièces', () => {
  it('listes-sans-doublon', () => {
    for (const [nom, { liste }] of Object.entries(COPIES)) {
      expect(new Set(liste).size, nom).toBe(liste.length);
      expect(liste.length, nom).toBeGreaterThan(0);
    }
  });

  it('listes-figees', () => {
    for (const [nom, { liste, attendu }] of Object.entries(COPIES)) {
      expect([...liste], nom).toEqual(attendu);
    }
  });

  it('nom-par-taux', () => {
    expect(nomParTaux('ht', 1900)).toBe('ht@1900');
    expect(nomParTaux('tva', 600)).toBe('tva@600');
    expect(nomParTaux('ht', 0)).toBe('ht@0');
    expect(nomParTaux('tva', Number.MAX_SAFE_INTEGER)).toBe('tva@9007199254740991');
  });

  it('nom-par-taux-refuse-non-entier', () => {
    for (const mauvais of [5.5, -1, Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 2]) {
      expect(
        code(() => nomParTaux('ht', mauvais)),
        String(mauvais),
      ).toBe('nom_de_champ_invalide');
    }
    expect(code(() => nomParTaux('tva', -0.5))).toBe('nom_de_champ_invalide');
  });

  it('champ-critique-tva-par-taux', () => {
    for (const nom of ['ttc', 'numero', 'date_piece', 'fournisseur_nom', 'fournisseur_siren']) {
      expect(estChampCritique(nom), nom).toBe(true);
    }
    expect(estChampCritique('fournisseur_tva')).toBe(true);
    expect(estChampCritique(nomParTaux('tva', 1900))).toBe(true);
    expect(estChampCritique('tva@0')).toBe(true);
  });

  it('champ-non-critique', () => {
    for (const nom of [
      'ht@1900',
      'tva',
      'xtva@1900',
      'TTC',
      'ttc ',
      '',
      'devise',
      'montant_du',
      'fournisseur_adresse',
      'langue',
      'tva_1900',
    ]) {
      expect(estChampCritique(nom), nom).toBe(false);
    }
  });

  it('est-dans-refuse-inconnu', () => {
    expect(estDans(TYPES_PIECE, 'facture')).toBe(true);
    expect(estDans(TYPES_PIECE, 'inconnu')).toBe(true);
    expect(estDans(TYPES_PIECE, '')).toBe(false);
    expect(estDans(TYPES_PIECE, 'Facture')).toBe(false);
    expect(estDans(TYPES_PIECE, 'FACTURE')).toBe(false);
    expect(estDans(TYPES_PIECE, 'facture ')).toBe(false);
    expect(estDans(TYPES_PIECE, 12)).toBe(false);
    expect(estDans(TYPES_PIECE, undefined)).toBe(false);
    expect(estDans([], 'facture')).toBe(false);
  });

  it('erreur-piece-porte-son-code', () => {
    const e = new ErreurPiece('nom_de_champ_invalide', 'Message fictif.');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(ErreurPiece);
    expect(e.code).toBe('nom_de_champ_invalide');
    expect(e.message).toBe('Message fictif.');
    expect(e.name).toBe('ErreurPiece');
  });
});
