// Visite guidée de la première pièce (E03) : textes visibles. Vouvoiement.
export const socleVisite = {
  titre: 'Visite guidée : votre première pièce',
  progression: 'Étape {n} sur {total}',
  etapes: [
    { titre: 'Déposez une pièce', texte: 'Glissez une photo ou un fichier dans la zone, ou choisissez-le sur votre appareil.' },
    { titre: 'Lecture en cours', texte: 'Nous lisons votre pièce. Cela prend un instant, vous pouvez rester sur cette page.' },
    { titre: 'Voyez la pièce lue', texte: 'La pièce lue apparaît avec ses informations. Vérifiez-les avant de continuer.' },
  ],
  lienPiece: 'Voir la pièce lue',
  actions: { suivant: 'Suivant', precedent: 'Précédent', terminer: 'Terminer', ignorer: 'Ignorer' },
} as const;
