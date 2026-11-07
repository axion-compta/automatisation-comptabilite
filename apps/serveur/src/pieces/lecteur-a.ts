// Lecteur A : appelle un modèle de texte par un port, valide sa sortie, plafonne le coût.
// Aucun fournisseur ici : l'adaptateur réel est une autre fiche. Aucun calcul sur les montants.
import { autoriserAppel, constaterApresAppel } from '../../../../packages/noyau/src/pieces/entree/limites.js';
import { ErreurPiece, type ChampLu, type TypePiece } from '../../../../packages/noyau/src/pieces/types.js';
import { sortieLecteurASchema, VERSION_SCHEMA, type SortieLecteurA } from './schema-lecteur-a.js';

export interface EntreeModele {
  invite: string;
  texte: string;
  versionInvite: number;
}

export interface ModeleTexte {
  completer(entree: EntreeModele): Promise<{ sortie: string; coutMicroCentimes: number }>;
  estimer(texte: string): number;
}

export interface DemandeLecteurA {
  texteTransmissible: string | null;
  jetonsOpaques: Record<string, string>;
  depenseMicroCentimes: number;
  plafondMicroCentimes: number;
  versionInvite: number;
}

export type ResultatLecteurA =
  | { champs: ChampLu[]; typePropose: TypePiece; depense: number; version: { schema: number; invite: number } }
  | { aVerifier: 'sortie_invalide' | 'plafond_cout'; depense: number }
  | { erreur: 'ia_indisponible'; depense: number };

const TENTATIVES_MAX = 2;
const INVITE = 'Extraire les champs de la pièce en JSON strict. Ne faire aucun calcul : recopier les valeurs.';

/** Remplace chaque clé par son jeton en une passe, la clé la plus longue d'abord. */
function pseudonymiser(texte: string, jetons: Record<string, string>): string {
  const cles = Object.keys(jetons)
    .filter((k) => k !== '')
    .sort((a, b) => b.length - a.length);
  let sortie = '';
  let i = 0;
  while (i < texte.length) {
    const cle = cles.find((k) => texte.startsWith(k, i));
    if (cle === undefined) {
      sortie += texte.charAt(i);
      i += 1;
    } else {
      sortie += jetons[cle];
      i += cle.length;
    }
  }
  return sortie;
}

function lireSortie(brut: string): SortieLecteurA | null {
  let json: unknown;
  try {
    json = JSON.parse(brut);
  } catch {
    return null;
  }
  const r = sortieLecteurASchema.safeParse(json);
  return r.success ? r.data : null;
}

export async function lireAvecModele(demande: DemandeLecteurA, modele: ModeleTexte): Promise<ResultatLecteurA> {
  if (demande.texteTransmissible === null) {
    throw new ErreurPiece('appel_interdit', 'Une pièce sensible ne peut pas être envoyée à un modèle.');
  }
  const texte = pseudonymiser(demande.texteTransmissible, demande.jetonsOpaques);
  const { plafondMicroCentimes, versionInvite } = demande;
  let depense = demande.depenseMicroCentimes;

  for (let essai = 1; essai <= TENTATIVES_MAX; essai += 1) {
    const verdict = autoriserAppel({ depenseMicroCentimes: depense, estimationMicroCentimes: modele.estimer(texte), plafondMicroCentimes });
    if (verdict === 'plafond_cout') return { aVerifier: 'plafond_cout', depense };

    let reponse: { sortie: string; coutMicroCentimes: number };
    try {
      reponse = await modele.completer({ invite: INVITE, texte, versionInvite });
    } catch {
      return { erreur: 'ia_indisponible', depense };
    }
    const apres = constaterApresAppel({ depenseMicroCentimes: depense, coutReelMicroCentimes: reponse.coutMicroCentimes, plafondMicroCentimes });
    depense = apres.depense;

    const sortie = lireSortie(reponse.sortie);
    if (sortie !== null) {
      const champs = sortie.champs.map(
        (c): ChampLu => ({ nom: c.nom, valeur: c.valeur, source: 'modele', lecteur: 'A', citation: c.citation }),
      );
      return { champs, typePropose: sortie.type_piece, depense, version: { schema: VERSION_SCHEMA, invite: versionInvite } };
    }
    if (apres.arret && essai < TENTATIVES_MAX) return { aVerifier: 'plafond_cout', depense };
  }
  return { aVerifier: 'sortie_invalide', depense };
}
