VERDICT: OK
SHA relu : 9c94f31dd0f5b1445443c57e71eb6a59cb89e432
PR : 925 — Fiche : L09-T41 (sensible: non)

## Vérifications
- Fichiers modifiés : 6, tous dans `fichiers_autorises`. `e45.ts` : ajouts seulement, comme le demande la fiche.
- Taille : 231 lignes ajoutées, 1 retirée (limite de la fiche : 300).
- Journal `pilotage/journal/L09-T41.md` : 6 lignes, commence par `# Journal L09-T41`.
- Règle 13 (auteur3) : aucune adresse ni secret ; lecture par `useLecture` contre le faux serveur ; données fictives (société Lemoine du faux serveur).
- Aucun mot interdit, aucun prix, pas de reprise du mot « estimation » (D4, testé). Aucune garde ni aucun test affaibli.
- Critères : 8 tests nommés sur 8 ; `pnpm garde:textes` passe ; `pnpm garde:appels` passe ; `pnpm verifier` passe (24 étapes).
- Mutations : `confirme = true` dans le bloc TVA, donc rouge (2 tests) ; chargement sans `aria-busy`, donc rouge ; phrase « régime de TVA à confirmer » retirée du bandeau, donc rouge.

## Remarques (non bloquantes)
- `apps/web/src/ecrans/e45/Ecran.tsx:18` : la liste `OBLIGATOIRES` recopie `CLES_OBLIGATOIRES` de `packages/noyau/src/profil/etat.ts`. Mieux vaut l'importer, pour éviter que les deux listes divergent.
- `affiche-les-champs` : une mutation qui place les champs non obligatoires avant les obligatoires passe encore le test, car le faux serveur ne renvoie que des clés obligatoires en tête. Ajouter au jeu de données un champ non obligatoire placé avant les autres rendrait le test plus fin.
