VERDICT: A CORRIGER
SHA relu : 662adf0dd6ec9a4d18d1a50a6f30f653ced192db

Relecture de la PR #921 (fiche L07-T17, sensible: non, branche lot-07/L07-T17).

Défaut bloquant
1. packages/contrat/src/__tests__/acces-service.test.ts:12 : `pnpm verifier` échoue à l'étape lint (`@typescript-eslint/no-unused-expressions`, colonne 89) sur `(sortie.push(k), parcourir(v, sortie))`. Le critère « pnpm verifier » de la fiche n'est donc pas tenu et la CI restera rouge. Correction : remplacer l'expression à virgule par un bloc, par exemple `for (const [k, v] of Object.entries(j)) { sortie.push(k); parcourir(v, sortie); }`. Ne pas toucher à la règle de lint.

Vérifié
- Fichiers modifiés : tous dans `fichiers_autorises` (8 fichiers) ; `handlers.ts`, `app.ts`, `routes.ts` et le contrat non touchés.
- Taille : 203 + 12 = 215 lignes, sous la limite de 280 de la fiche ; aucune ligne « - - ».
- Une seule logique : le vrai serveur et le faux serveur appellent `creerServiceAcces` du contrat ; le service ne fait aucun `new Date()` (horloge injectée).
- Règle 13 (auteur3) : aucune adresse, port ni secret ; seule `http://exemple.fr` dans le test ; l'état vient du scénario fictif, rien n'est branché sur la console.
- Les 8 tests nommés sont présents ; suite commune (4 cas) jouée sur les deux cibles. Vitest ciblé : 16/16 verts.
- Mutations (toutes rougissent) : LECTURE_SEULE ajouté aux états qui traitent (3 rouges), condition `reprise=oui` retirée (7), lien forcé à une autre valeur (6), `prochaine_etape_le` forcé à null (1), faux serveur qui ignore le scénario de la requête (3).
- Aucun prix, aucun mot interdit, données fictives ; journal de 6 lignes commençant par `# Journal L07-T17`.
- Hors lint, `pnpm verifier` est vert : types, 699 fichiers de test, toutes les gardes.

Remarques (non bloquantes)
- Journal : « 7 tests nommés sur le service » ; le 8e (`memes-reponses-vrai-et-faux`) est dans `commun-acces.test.ts`, ce qui est cohérent.
