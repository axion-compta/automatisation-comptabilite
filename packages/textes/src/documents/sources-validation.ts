// Textes de la TVA à payer, de la veille, de Sirene, des connecteurs et des raisons du cas sûr.
// Rendus à partir des codes du noyau. Vouvoiement. Aucun chiffre estimé.
export const sourcesValidation = {
  tva: {
    // Le pluriel s'applique à tout n différent de 1. Avec 0 pièce, l'écran n'appelle pas cette fonction.
    bloquee: (n: number): string => `TVA bloquée : ${String(n)} ${n === 1 ? 'pièce' : 'pièces'} à lever`,
    aConfirmer: 'Montant à confirmer',
    payee: (par: string, le: string): string => `TVA payée par ${par}, le ${le}`,
    interrupteurSousReserve: 'Inclure la TVA sous réserve',
    interrupteurVerrouille:
      'Ce réglage est verrouillé sur « Non » : la TVA sous réserve n’est jamais déduite. Votre demande est refusée et notée au journal.',
  },
  veille: {
    reglesPossiblementPerimees: 'Règles possiblement périmées : à vérifier',
  },
  sirene: {
    etablissementFerme: 'Établissement fermé : vérifiez avant de poursuivre.',
    saisieManuelle: 'Le service de recherche des entreprises ne répond pas. Saisissez les informations à la main.',
  },
  connecteurs: {
    degrade: 'Cette connexion fonctionne mal : saisissez les informations à la main ou réessayez demain.',
    enPanne: 'Cette connexion est en panne : saisissez les informations à la main, puis réessayez demain.',
  },
  casSur: {
    nature_jamais_sure: 'Ce type d’opération demande toujours votre validation.',
    lecture_douteuse: 'La lecture de la pièce n’est pas assez nette : vérifiez-la.',
    fournisseur_peu_valide: 'Vous n’avez pas encore validé assez de pièces de ce fournisseur sur ce compte.',
    anomalie_ouverte: 'Une anomalie reste ouverte sur cette pièce ou ce fournisseur.',
    montant_au_seuil_ou_plus: 'Le montant atteint ou dépasse la limite fixée pour la validation en lot.',
    fournisseur_hors_union: 'Ce fournisseur est situé hors de l’Union européenne.',
    tva_en_doute: 'La TVA de cette pièce est en doute : vérifiez-la.',
    compte_absent: 'Aucun compte de charge n’est proposé pour cette pièce.',
  },
} as const;
