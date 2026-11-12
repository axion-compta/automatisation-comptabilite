// Spécialités d'agent affichées dans « Pourquoi ? » : liste fermée, libellés lus par le lecteur d'écran.
// Aucun prénom, aucun visage : une fonction, jamais une personne.
export const agents = {
  specialites: {
    lecture: 'Spécialité : lecture des pièces',
    banque: 'Spécialité : rapprochement bancaire',
    tva: 'Spécialité : TVA',
    controle: 'Spécialité : contrôle',
    chat: 'Spécialité : conversation',
  },
  neutre: 'Spécialité : assistant',
} as const;
