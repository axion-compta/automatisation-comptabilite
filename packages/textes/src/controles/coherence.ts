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
  'CC-K01': (v) => `Une écriture de ${v.nom} ne s'équilibre pas : débit et crédit diffèrent de ${v.montant}. Corrigez-la avant toute déclaration.`,
  'CC-K02': (v) => `La balance de l'exercice au ${v.date} ne s'équilibre pas (écart ${v.montant}) : nous corrigeons avant toute déclaration.`,
  'CC-K03': (v) => `Le compte ${v.compte} présente un solde incohérent (${v.montant}). Relisez les écritures concernées.`,
  'CC-K04': (v) => `Les montants de cette facture ne tombent pas juste (écart ${v.montant}). Relisez-les.`,
  'CC-K05': (v) => `La somme des lignes de la facture de ${v.nom} ne correspond pas au pied de facture (écart ${v.montant}). Relisez les lignes.`,
  'CC-K06': (v) => `Le montant dû (${v.montant}) diffère du total TTC de la facture de ${v.nom}. Vérifiez s'il s'agit d'un acompte, d'un avoir ou d'une remise.`,
  'CC-K07': (v) => `La TVA de cette facture (${v.montant}) ne correspond pas à la base multipliée par le taux. Relisez le taux appliqué.`,
  'CC-K08': (v) => `Cette facture n'est pas adressée à votre société mais à ${v.nom}. Vérifiez le destinataire.`,
  'CC-K09': (v) => `Le numéro de TVA intracommunautaire de ${v.nom} n'est pas valide. Vérifiez-le.`,
  'CC-K10': (v) => `Cette vente est adressée à un particulier ou à un tiers inconnu : ${v.nom}. Vérifiez le client.`,
  'CC-K11': (v) => `La date ${v.date} de cette pièce est future ou hors de l'exercice en cours. Vérifiez-la.`,
  'CC-K11M': (v) => `La date ${v.date} de cette pièce tombe dans une période déjà close. Vérifiez-la ou choisissez une autre date.`,
  'CC-K12': (v) => `La nature de cette dépense chez ${v.nom} est douteuse : immobilisation, caution ou hors activité. Vérifiez-la.`,
  'CC-K12H': (v) => `Cette dépense de ${v.montant} s'écarte de la nature habituelle du fournisseur ${v.nom}. Vérifiez-la.`,
  'CC-K13': (v) => `${v.nombre} paiements sans facture (${v.montant}).`,
  'CC-K13S': (v) => `${v.nombre} paiements sans facture depuis plus d'un mois (${v.montant}).`,
  'CC-K14': () => 'Ce document contient des instructions inhabituelles. Il est mis de côté : regardez-le avant de l\'utiliser.',
};
