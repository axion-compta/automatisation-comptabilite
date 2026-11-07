// Écran E45 « Mon entreprise » : textes visibles. Vouvoiement.
export const e45 = {
  titre: 'Mon entreprise',
  champs: {
    denomination: "Nom de l'entreprise",
    siren: 'Numéro SIREN',
    forme: "Forme de l'entreprise",
    regimeTva: 'Régime de TVA',
    adresse: 'Adresse du siège',
    codePostal: 'Code postal du siège',
    numeroTva: 'Numéro de TVA',
  },
  boutons: { modifier: 'Modifier', voirEffet: "Voir l'effet", confirmer: 'Confirmer', voirSource: 'Voir la source' },
  mention: 'Préparé par IA, à valider',
  principe: "Chaque changement dit son effet avant d'être fait",
} as const;
