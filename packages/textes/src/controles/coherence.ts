// Textes des contrôles de cohérence (V3-CTL-021 à 060, V3-UX-074). Vouvoiement ; valeurs déjà formatées, jamais calculées ici.

export interface ValeursCoherence {
  montant: string;
  date: string;
  nom: string;
  compte: string;
  nombre: string;
}

export type TexteCoherence = (v: ValeursCoherence) => string;

export const textesCoherence: Record<string, TexteCoherence> = {
  'CC-K01': (v) => `Les écritures de ${v.nom} ne s'équilibrent pas (écart ${v.montant}). Corrigez-les avant toute déclaration.`,
  'CC-K02': (v) => `Une écriture du ${v.date} déséquilibre vos comptes (écart ${v.montant}) : nous corrigeons avant toute déclaration.`,
  'CC-K03': (v) => `Le compte ${v.compte} présente un solde incohérent (${v.montant}). Relisez les écritures concernées.`,
  'CC-K04': (v) => `Les montants de cette facture ne tombent pas juste (écart ${v.montant}). Relisez-les.`,
  'CC-K05': (v) => `La facture de ${v.nom} du ${v.date} existe déjà dans vos pièces. Vérifiez qu'elle n'est pas comptée deux fois.`,
  'CC-K06': (v) => `La date ${v.date} de cette pièce est hors de la période ouverte. Vérifiez-la.`,
  'CC-K07': (v) => `Le fournisseur ${v.nom} n'a pas de compte attribué. Choisissez le compte à utiliser.`,
  'CC-K08': (v) => `Le compte ${v.compte} n'existe pas dans votre plan. Choisissez un compte existant.`,
  'CC-K09': (v) => `Le total de la facture de ${v.nom} (${v.montant}) diffère de la somme de ses lignes. Relisez-la.`,
  'CC-K10': (v) => `Le numéro de cette pièce du ${v.date} interrompt la suite habituelle. Vérifiez qu'il ne manque rien.`,
  'CC-K11': (v) => `${v.nombre} pièces sont encore à vérifier (${v.montant}).`,
  'CC-K11M': (v) => `${v.nombre} pièces à vérifier datent de plus d'un mois (${v.montant}).`,
  'CC-K12': (v) => `Le relevé du ${v.date} laisse un écart de ${v.montant} avec votre comptabilité. Relisez les mouvements.`,
  'CC-K12H': (v) => `Le relevé du ${v.date} sort de la période de ${v.nom} (écart ${v.montant}). Vérifiez les dates.`,
  'CC-K13': (v) => `${v.nombre} paiements sans facture (${v.montant}).`,
  'CC-K13S': (v) => `${v.nombre} paiements sans facture depuis plus d'un mois (${v.montant}).`,
  'CC-K14': () => 'Ce document contient des instructions inhabituelles. Il est mis de côté : regardez-le avant de l\'utiliser.',
};
