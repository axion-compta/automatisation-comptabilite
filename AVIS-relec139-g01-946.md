VERDICT: OK
SHA relu: 863dec1b6cb1c3603b0bc3148a9b718f56d18380
PR 946 — L06-T28, contrat GET /moi/capacites, serveur en mémoire avec une session injectée par les tests. La fiche est sensible (`sensible: oui`) : c'est Will qui fusionne.

## Contrôles
- Fichiers modifiés : 10, tous dans `fichiers_autorises`.
- Taille : 203 lignes ajoutées et 3 retirées, sous la limite de 300 ; aucune ligne « - - ».
- Journal : 7 lignes, commence par `# Journal L06-T28`.
- Les 8 tests nommés sont présents (2 côté contrat, 6 côté serveur).
- `vitest run apps/serveur packages/contrat packages/faux-serveur` : 195 fichiers et 1751 tests passent.
- `openapi.json` régénéré avec `node packages/contrat/scripts/openapi.mjs` : aucun écart.
- `node outils/gardes/fiches.mjs` : vert.
- Mutations faites à la main, toutes rougissent puis ont été annulées :
  - retirer le 401 quand la session manque fait rougir `sans-session-401` ;
  - remplacer la phrase par le texte générique fait rougir `lecture-dix-refus-dix-phrases` ;
  - tout déclarer permis fait rougir 2 tests ;
  - inverser l'ordre des actions fait rougir `ordre-des-actions-stable`.
- Aucun en-tête n'est lu (vérifié par le test avec `x-role` et `x-societe`). Le préfixe vient de `cheminSociete`, rien n'est écrit en dur.
- Règle 13 respectée : en production, sans session injectée, la route répond toujours 401. Aucun accès à la console et aucune adresse de serveur.
- Aucun secret, aucun prix, aucun mot interdit ; les données sont fictives (`soc-fictive`, `p-fictive`).

## Remarques (non bloquantes)
- `apps/serveur/src/domaines/capacites.ts:22` : la condition `permis || raison === undefined` renverrait `permis: true` pour un refus sans raison. Ce cas ne peut pas arriver aujourd'hui, car `capacites()` du noyau lève une erreur dans ce cas, mais il vaut mieux trancher en faveur du refus. Suggestion pour une fiche suivante : ne tester que `permis`.
- `creerApp` porte maintenant deux mécanismes de session : `options.session` (FournisseurSession, routes des contrôles) et `options.securite.session` (cette fiche). C'est voulu par la fiche, mais il faudra les réunir quand la vraie session (J3a) arrivera.
- Le `catch` renvoie toute erreur interne du noyau en 401. C'est acceptable tant que la session est injectée par les tests ; à revoir avec la vraie session.
