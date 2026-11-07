// Messages des principes (spec 13, fichiers 01 et 02). Vouvoiement, phrases courtes, aucun pourcentage de confiance.
export const messagesPrincipes = Object.freeze({
  ecritureValidee: 'Cette écriture est validée : je peux la corriger par une contre-passation.',
  periodeCloturee: 'Cette période est clôturée : je propose la correction sur la période ouverte.',
  hypothese: 'Hypothèse, à confirmer',
  memoireCorrection: "Je m'en souviens pour cette société",
  aucune_donnee: 'Aucune vente enregistrée.',
  donnee_absente: 'Donnée absente pour le moment.',
  pas_de_point_de_comparaison: 'Pas de point de comparaison',
  apresImmatriculation: 'Disponible après immatriculation',
  mentionDeclaration:
    'Préparé par IA, à valider. La responsabilité de la déclaration reste la vôtre et celle de votre expert-comptable.',
  geste_humain_requis: "Cette action demande l'accord d'une personne : elle n'est jamais faite automatiquement.",
  permission_manquante: "Vous n'avez pas la permission de faire cette action.",
  reauth_requise: 'Confirmez votre identité pour continuer.',
  passage_direct_interdit: 'Ce passage direct est interdit : suivez les étapes prévues.',
  pilote_trop_court: 'La période de pilotage est trop courte pour cette action.',
  motif_obligatoire: 'Indiquez un motif pour continuer.',
  introuvable: 'Élément introuvable.',
});

export type CodeMessagePrincipe = keyof typeof messagesPrincipes;
export type RaisonIndicateurVide = 'aucune_donnee' | 'donnee_absente' | 'pas_de_point_de_comparaison';

export function messagePrincipe(code: CodeMessagePrincipe): string {
  return messagesPrincipes[code];
}

export function raisonIndicateurVide(raison: RaisonIndicateurVide): string {
  return messagesPrincipes[raison];
}
