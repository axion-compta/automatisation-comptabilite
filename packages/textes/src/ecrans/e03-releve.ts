// Écran E03, état « Import d'un relevé » : textes visibles. Vouvoiement.
export const e03Releve = {
  titre: "Import d'un relevé",
  apercu: {
    legende: 'Aperçu des premières lignes de votre relevé',
    date: 'Date',
    libelle: 'Libellé',
    montant: 'Montant',
  },
  boutons: { confirmer: "Confirmer l'import", annuler: 'Annuler cet import' },
  rapport: {
    titre: "Résultat de l'import",
    comptes: 'Lignes lues : {lues}, importées : {importees}, rejetées : {rejetees}',
  },
  refus: {
    solde_pdf_faux: 'Le solde inscrit dans ce relevé ne correspond pas à ses lignes : il ne peut pas être importé.',
    format_inconnu: "Le format de ce fichier n'est pas reconnu : il ne peut pas être importé.",
    xml_refuse: "Ce fichier XML n'a pas pu être accepté : il ne peut pas être importé.",
  },
  vide: 'Ce relevé ne contient aucune ligne à importer.',
  annule: 'Cet import est annulé : aucune ligne de ce relevé ne reste dans votre comptabilité.',
  etats: {
    chargement: 'Traitement de votre relevé en cours…',
    panne: "Votre relevé n'a pas pu être traité. Réessayez dans un instant.",
  },
};
