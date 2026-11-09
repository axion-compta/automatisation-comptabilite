VERDICT: OK
SHA relu : a6756e271d6cb3e4aea4ae955e6a1d156c99266e

Relecture de la PR #919 (fiche L02-T58, branche lot-02/L02-T58).

Vérifié
- Fichiers modifiés : 7, tous dans `fichiers_autorises`. Taille : 225 lignes pour 260 permises ; moins de 400.
- Tests : les 6 tests nommés passent (explication.test.tsx).
- Mutations (chacune fait rougir un test, puis annulée) : focus non rendu au bouton → `fermeture-rend-le-focus` ; bloc « Autres factures possibles » affiché même vide → `autres-candidats-affiches` ; 404 affichée comme erreur générique → `erreur-404-message` ; facteur à 0 point masqué → `autres-candidats-affiches`.
- Cas limites de la fiche couverts : facteur à 0 point, aucun autre candidat (bloc et titre absents), ligne sans score.
- Critères : garde:textes et garde:appels vertes ; `pnpm verifier` : tout vert sauf deux tests de durée du chat (filtre-sortie, gardien-entree, « entrées volumineuses : fin rapide ») qui ont dépassé leur délai pendant trois `verifier` lancés en parallèle ; relancés seuls : 24/24 verts ; fichiers sans rapport avec la PR. CI verte au SHA relu.
- Lecture seule (aucune écriture), aucun IBAN affiché, aucun texte en dur (tout dans e12.ts).
- Aucun secret ni adresse, aucun mot interdit, aucun prix (« 120,00 € » est un montant de ligne fictive dans le test), données fictives (Fictiva Telecom, FA-2026-0142). Journal : 7 lignes, commence par `# Journal L02-T58`.

Remarques (non bloquantes)
- Explication.tsx : `remplir` est recopié depuis Ecran.tsx ; à mettre en commun plus tard.
- Le texte `autre` affiche le score sans unité (« Facture FA-2026-0199 (62) ») : à préciser lors d'une prochaine fiche de textes.
