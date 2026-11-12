// Écran E03 « Déposer des pièces » : textes visibles. Vouvoiement.
export const e03 = {
  titre: 'Déposer des pièces',
  zone: {
    zone: 'Glissez vos pièces ici',
    bouton: 'Choisir des fichiers',
    survol: 'Relâchez pour déposer vos pièces',
  },
  conservation: 'Conservez vos justificatifs originaux : la photo sert à la saisie et au classement.',
  etats: {
    envoi: 'Envoi de vos pièces en cours…',
    erreur: "Vos pièces n'ont pas pu être envoyées. Réessayez dans un instant.",
  },
  resultats: {
    titre: 'Résultat de votre dépôt',
    recue: 'reçue',
    voir: 'Voir la pièce',
    dejaRecue: 'déjà reçue le {date}',
    refusee: 'refusée : {raison}',
    refusInconnu: "ce fichier n'a pas pu être accepté",
  },
  refus: {
    type_refuse: "ce type de fichier n'est pas accepté",
    macro_refusee: 'ce document contient des commandes automatiques (macros)',
    archive_refusee: "les archives compressées ne sont pas acceptées, déposez les pièces une par une",
    image_refusee: "cette image n'a pas pu être lue",
    trop_grand: 'ce fichier est trop volumineux',
    infecte: 'ce fichier présente un danger pour vos données',
  },
} as const;
