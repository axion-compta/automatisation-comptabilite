// Textes des contrôles de TVA (V3-CTL-024, V3-CTL-025, V3-TVA-030, V3-UX-074). Vouvoiement ; valeurs déjà formatées.
// Un taux ou un seuil affiché arrive en valeur ; quand sa source est « à vérifier », la phrase le dit.

export interface ValeursTva {
  montant: string;
  seuil: string;
  mois: string;
  nom: string;
  pays: string;
  nombre: string;
  aVerifier: boolean;
}

export type TexteTva = (v: ValeursTva) => string;

const verif = (v: ValeursTva): string => (v.aVerifier ? ', à vérifier' : '');

export const textesTva: Record<string, TexteTva> = {
  'CC-T01': (v) => `La période de TVA ${v.mois} n'est pas encore définie. Choisissez-la avant de continuer.`,
  'CC-T02': (v) => `${v.nombre} factures ont une TVA à trancher (TVA en jeu : ${v.montant}). La déclaration de la période ${v.mois} sera préparée quand elles le seront.`,
  'CC-T03': (v) => `La TVA de la facture de ${v.nom} (${v.montant}) ne correspond pas à son total. Relisez-la.`,
  'CC-T03A': (v) => `La TVA de l'avoir de ${v.nom} (${v.montant}) ne correspond pas à son total. Relisez-le.`,
  'CC-T04': (v) => `Le numéro de TVA de ${v.nom} est absent. Ajoutez-le pour déduire ${v.montant}.`,
  'CC-T05': (v) => `Le régime de TVA de ${v.nom} n'est pas renseigné : la déclaration de la période ${v.mois} ne peut pas être préparée.`,
  'CC-T06': (v) => `La TVA déductible de la période ${v.mois} (${v.montant}) dépasse la TVA collectée. Vérifiez vos achats.`,
  'CC-T07': (v) => `Une facture de ${v.nom} porte un taux de TVA inhabituel. Vérifiez-le avant de déduire ${v.montant}.`,
  'CC-T08': (v) => `${v.nombre} factures de la période ${v.mois} sont sans TVA alors qu'elles devraient en porter (${v.montant}).`,
  'CC-T09': (v) => `Cet achat ${v.pays} n'est pas encore pris en charge : la TVA du mois ne peut pas être préparée tant qu'il reste dans la période.`,
  'CC-T10': (v) => `Une vente à ${v.nom} ${v.pays} demande une vérification de TVA (${v.montant}).`,
  'CC-T11': (v) => `La déclaration de la période ${v.mois} diffère de la précédente de ${v.montant}. Relisez les écarts.`,
  'CC-T12': (v) => `Votre chiffre d'affaires approche du seuil (${v.montant} sur ${v.seuil}${verif(v)}).`,
  'CC-T12M': (v) => `Votre chiffre d'affaires dépasse le seuil (${v.montant} sur ${v.seuil}${verif(v)}).`,
  'CC-T13': (v) => `Un crédit de TVA de ${v.montant} est reporté sur la période ${v.mois}. Vérifiez le report.`,
  'CC-T14': (v) => `La date limite de la déclaration de la période ${v.mois} approche (${v.nombre} jours restants).`,
  'CC-T15': (v) => `La déclaration de la période ${v.mois} n'a pas encore été relue (TVA à payer : ${v.montant}).`,
  'CC-T16': (v) => `${v.nombre} paiements de la période ${v.mois} ne sont pas rattachés à une facture (TVA en jeu : ${v.montant}).`,
  'CC-T17': (v) => `Le compte de TVA de la période ${v.mois} affiche un écart de ${v.montant} avec la déclaration. Relisez-le.`,
  'CC-T18': (v) => `Votre chiffre d'affaires de services approche du seuil (${v.montant} sur ${v.seuil}${verif(v)}).`,
  'CC-T18M': (v) => `Votre chiffre d'affaires de services dépasse le seuil (${v.montant} sur ${v.seuil}${verif(v)}).`,
  'CC-T19': (v) => `La période ${v.mois} contient une opération ${v.pays} à confirmer (${v.montant}).`,
};
