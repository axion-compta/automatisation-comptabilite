// Motifs et mots-clés sensibles (minuscules, sans accents, FR et EN). Fichier versionné : tout ajout passe par une PR.
export const MOTIFS_SENSIBLES = {
  version: 1,
  pieceIdentite: ["carte nationale d'identite", 'passport', 'passeport', 'titre de sejour', 'identity card', 'residence permit'],
  santePaie: ['bulletin de paie', 'bulletin de salaire', 'payslip', 'arret de travail', 'feuille de soins', 'ordonnance medicale', 'medical certificate'],
  secrets: ['mot de passe', 'password', 'code pin', 'jeton de paiement', 'payment token'],
} as const;
