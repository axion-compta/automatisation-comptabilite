// Écran E50 « Mes données et mes droits », section « Demandes des personnes ». Vouvoiement.
export const e50Personnes = {
  titre: "Demandes des personnes",
  intro:
    "Retrouvez ici les demandes faites par les personnes dont vous gardez les données : accès, correction, effacement, limitation, copie ou opposition. Chaque demande est suivie jusqu'à sa réponse.",
  aucuneDemande: "Aucune demande pour le moment.",
  colonnes: {
    type: "Type de demande",
    recueLe: "Reçue le",
    echeance: "À traiter avant le",
    etat: "État",
  },
  types: {
    acces: "Accès aux données",
    rectification: "Correction des données",
    effacement: "Effacement des données",
    limitation: "Limitation de l'usage",
    portabilite: "Copie des données",
    opposition: "Opposition",
  },
  etats: {
    recue: "Reçue",
    en_cours: "En cours",
    traitee: "Traitée",
    refusee: "Refusée",
    transmise_a_la_societe: "Transmise à votre société",
  },
  enRetard: "En retard : cette demande aurait dû recevoir une réponse.",
  aRappeler: "À traiter bientôt : l'échéance approche.",
  rechercher: {
    titre: "Retrouver une personne",
    nom: "Nom",
    email: "E-mail",
    iban: "IBAN",
    bouton: "Rechercher",
    aucunResultat: "Aucune personne trouvée avec ces informations.",
    tropCourt: "Saisissez davantage de caractères pour lancer la recherche.",
  },
  traiter: {
    titre: "Traiter la demande",
    issue: "Réponse à donner",
    motif: "Motif",
    source: "Source",
    autresPersonnes: "Cette demande concerne aussi d’autres personnes",
    autresPersonnesAide:
      "Si les données d'autres personnes apparaissent dans la réponse, vérifiez qu'elles peuvent être communiquées.",
    valider: "Valider la réponse",
    annuler: "Annuler",
  },
  issues: {
    acces_produit: "Les données ont été communiquées à la personne.",
    portabilite_produite:
      "Une copie des données a été préparée pour la personne.",
    rectifiee: "Les données ont été corrigées.",
    a_effacer: "Les données sont marquées à effacer et masquées partout.",
    limitee: "L'usage des données est limité.",
    refus_conservation:
      "L'effacement est refusé : les données doivent être conservées.",
    refus_gel:
      "L'effacement est refusé : les données sont gelées pour le moment.",
    renvoi_societe: "La demande est renvoyée à votre société.",
  },
  conserveJusquAu: "Conservé jusqu’au {date}. Source : {source}.",
  dateAConfirmer: "date à confirmer",
  aEffacerExplication:
    "Les données sont d'abord marquées à effacer et masquées partout. L'effacement réel est fait ensuite par notre équipe.",
  sauvegardesExplication:
    "Les copies de sauvegarde ne sont pas modifiées. Elles sont remplacées au fil du temps ; une donnée marquée à effacer n'est pas remise en service. Conservé jusqu'au {date}. Source : {source}.",
  erreurs: {
    motifManquant: "Indiquez le motif de votre réponse.",
    sourceManquante: "Indiquez la source de la conservation.",
    dejaTraitee: "Cette demande a déjà reçu une réponse.",
    transitionInterdite: "Ce changement d'état n'est pas possible.",
    issueNonPermise: "Cette réponse n'est pas permise pour ce type de demande.",
    reglageAbsent:
      "Le réglage nécessaire n'est pas renseigné : demandez-le à votre administrateur.",
  },
} as const;
