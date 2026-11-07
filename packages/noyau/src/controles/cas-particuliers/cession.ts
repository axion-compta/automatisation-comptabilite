// Cession d'un bien meuble : écriture de TVA proposée seulement si le paramètre est validé.
// Traitement envisagé, à vérifier. Aucun texte affiché : seulement des codes.
import { ajouter, pourcentage, type Arrondi, type Centimes } from '../../argent/index.js';
import { verifierEcriture, type Ecriture } from '../../ecritures/modele.js';
import { entierParametre, ErreurControle, exigerCentimes, parametreUtilisable } from '../regles/commun.js';
import type { ParametreLu } from '../regles/commun.js';

export interface EntreeCession {
  prixHt: Centimes;
  tvaAchatDeduite: boolean | null;
  parametre: ParametreLu;
  comptes: { creance: string; produit: string; tvaCollectee: string };
  date: string;
  journal: string;
  arrondi: Arrondi;
}

export type CodeRefusCession = 'parametre_non_valide' | 'historique_absent' | 'sans_tva';

export type ResultatCession = { etat: 'propose'; ecriture: Ecriture } | { etat: 'refuse'; code: CodeRefusCession };

const refus = (code: CodeRefusCession): ResultatCession => ({ etat: 'refuse', code });

export function proposerEcritureCession(e: EntreeCession): ResultatCession {
  if (exigerCentimes(e.prixHt) <= 0) throw new ErreurControle('entree_invalide');
  if (!parametreUtilisable(e.parametre)) return refus('parametre_non_valide');
  if (e.tvaAchatDeduite === null) return refus('historique_absent');
  if (!e.tvaAchatDeduite) return refus('sans_tva');
  const tva = pourcentage(e.prixHt, entierParametre(e.parametre), e.arrondi);
  const libelle = 'cession';
  const ecriture: Ecriture = {
    id: 'cession-' + e.journal + '-' + e.date,
    journal: e.journal,
    date: e.date,
    statut: 'propose',
    lignes: [
      { compte: e.comptes.creance, libelle, debit: ajouter(e.prixHt, tva), credit: 0 as Centimes },
      { compte: e.comptes.produit, libelle, debit: 0 as Centimes, credit: e.prixHt },
      { compte: e.comptes.tvaCollectee, libelle, debit: 0 as Centimes, credit: tva },
    ],
  };
  verifierEcriture(ecriture);
  return { etat: 'propose', ecriture };
}
