VERDICT: OK
SHA relu : f908a6e0cacbad8d45c52f181df41b24250304b0

# Avis relec142-g01-947 — PR 947 (fiche L14-T39, sensible)

## Vérifications
- Fichiers modifiés (9) : tous dans `fichiers_autorises`. Rien sous `.github/` ni `outils/`, aucune garde touchée.
- Taille : 557 lignes ajoutées et 3 supprimées en tout, dont 267 dans `openapi.json` (généré, compté à part selon la fiche). Le reste fait 290 lignes, sous `taille_max_lignes: 300`, et `--numstat` ne contient aucune ligne « - - ».
- Tests ciblés : `juridique-ecriture.test.ts` (14 tests nommés), `routes-interdites.test.ts` et `gestes-routes.test.ts` passent, soit 27/27. `contrat:diff` est identique et `routesEcritureSansEnTete()` vaut `[]`. La CI est verte sur le SHA relu.
- Mutations sur `apps/serveur/src/domaines/juridique-ecriture.ts`, toutes annulées ensuite :
  1. `validerRapport` en exigence `ordinaire` au lieu de `recent` : 6 tests rouges.
  2. Contrôle du représentant légal retiré : 1 rouge (`rapport-non-representant-403`).
  3. Contrôle `DEJA_FAIT` retiré : 1 rouge.
  4. Écriture de trace retirée : 4 rouges.
  5. Verdict de niveau ignoré : 2 rouges.
  Le critère « rouge si l'appel au port de session est retiré » est tenu, car une session absente donne `non_authentifie` au lieu de `reauthentification_requise`.
- Règle 13 de CONSIGNE-AUTEUR3 : la session, la trace et l'horloge passent par des interfaces injectées avec des faux ports. Le code ne contient ni adresse, ni machine, ni port, ni identifiant ou secret de serveur, et n'accède jamais à la base de la console. Le service par défaut refuse tout en 401.
- Données fictives (SIREN du jeu, `PERS-ESSAI-1`, `PIECE-1`). Aucun secret, aucun prix, aucun mot interdit. Aucune route ni operationId contenant `deposer`, `depot` ou `transmettre`.
- Journal : 7 lignes, commence par `# Journal L14-T39`.

## Remarques (non bloquantes)
- `apps/serveur/src/domaines/juridique-ecriture.ts:58` (`piece`) : le contrôle cherche l'objet dans toutes les cartes de l'exercice sans regarder leur `code`. `enregistrerPieceConvention` sur une carte de décision rend donc `archivee`, et l'inverse rend `deposee`. Le risque est faible tant que rien n'est persisté, mais il faut filtrer par code de carte dans la fiche de suite de persistance.
- Les clés d'idempotence (`rejeux`) sont globales et ne sont pas liées à `personneId`. C'est acceptable en mémoire, à revoir au branchement de la vraie session (console).
- Fiche sensible : le code `G02` de `validerRapport` dans `ROUTES_A_GESTE` reste à confirmer par Will, et la fusion revient à Will seul.
