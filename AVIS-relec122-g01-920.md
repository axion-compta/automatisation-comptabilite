VERDICT: OK
SHA relu : e6176addb4acdcdaf4b74b9c12e828d428747aa5

Relecture de la PR #920 (fiche sensible L06-T06, branche lot-06/L06-T06).

Vérifié
- Fichiers modifiés : 4, tous dans `fichiers_autorises` ; packages/noyau/src/index.ts non touché. Taille : 92 lignes pour 150 permises.
- `capacites` : une ligne par action de `ACTIONS`, dans l'ordre, calculée par `autoriser` sans objet ; contexte non modifié ; aucune dépendance, aucun littéral décimal.
- Tests : les 5 tests nommés + `entree-invalide-et-non-modifiee` passent (6/6). C25 : 13 refus sur 14 pour le rôle lecture, tous avec `role_lecture`.
- Mutations : raison retirée des refus → 4 tests rougissent ; ordre inversé → `quatorze-lignes-dans-l-ordre` ; tout permis → 4 tests rougissent.
- Critères : `pnpm verifier` vert sauf un test de durée du chat (filtre-sortie, « entrées volumineuses : fin rapide ») qui a dépassé son délai pendant trois `verifier` en parallèle ; relancé seul : vert ; sans rapport avec la PR. Stryker : tâche CI `stryker` verte au SHA relu (seuil 80). CI entièrement verte.
- Aucun secret ni adresse, aucun mot interdit, aucun prix, données fictives (p-1). Journal : 7 lignes, commence par `# Journal L06-T06`. Aucune garde ni test affaibli.

Remarques (non bloquantes)
- La branche `if (!d.raison) throw` survit à la mutation (retirée, les tests restent verts) : elle est inatteignable par `autoriser`, ce que le journal signale. Risque faible ; un test avec un `autoriser` simulé rendant un refus sans raison la couvrirait.
