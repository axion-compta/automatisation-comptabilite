// Textes de la porte d'acceptation : seulement des intitulés, aucun texte de CGV. Vouvoiement.
export const acceptation = {
  titre: 'Documents à accepter',
  introduction: 'Pour utiliser votre espace, merci de lire et d’accepter la version en vigueur de chaque document.',
  types: { cgv: 'Conditions générales de vente' } as Record<string, string>,
  typeInconnu: 'Document contractuel',
  version: 'Version',
  approuveLe: 'Approuvée le',
  sources: 'Sources',
  case: 'J’ai lu et j’accepte',
  bouton: 'Accepter',
  lienDonnees: 'Mes données et mes droits',
} as const;
