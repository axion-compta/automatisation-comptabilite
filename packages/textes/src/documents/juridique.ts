// Textes juridiques (V3-JUR-019, -014, -002, -003, -009, -016, -017). Vouvoiement ; aucun nombre en dur.
// Les modules du noyau rendent des codes ; les phrases vivent ici. Les valeurs arrivent déjà formatées.
export const juridique = {
  chaineA: 'document de travail, ne remplace pas le registre légal',
  chaineB: 'à recopier dans votre registre légal',
  phraseGreffe: 'pas de dépôt au greffe pour ce document',
  mentionPreparation: 'Préparé par IA, à valider',
  cartes: {
    saisir_delai_statuts: 'Saisissez le délai prévu par vos statuts',
    convocation_tardive: 'Convocation tardive : à vérifier avec votre expert-comptable',
    assemblee_trop_proche: 'Assemblée trop proche de la convocation : vérifiez la date avec votre expert-comptable',
    completer_bilan_effectif: 'Complétez le bilan et l’effectif',
    decision_absente: 'À vérifier : aucune décision n’est enregistrée pour cette rémunération',
    ecart_montant: (montant: string): string => `Écart à vérifier : ${montant}`,
    deposer_convention: 'Déposez la convention',
    retenue_a_verifier: 'Retenue à vérifier',
    dispense: (source: string, dateReleve: string): string =>
      `Pas de rapport de gestion demandé (source : ${source}, relevé le ${dateReleve})`,
  },
  rubriquesSci: {
    activite: 'Activité',
    loyers: 'Loyers',
    charges: 'Charges',
    emprunts: 'Emprunts',
    resultat: 'Résultat',
    comptesCourants: 'Comptes courants',
  },
} as const;
