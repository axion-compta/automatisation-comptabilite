VERDICT: OK
PR #1140 (L11-T40). SHA de tête relu : e2116f3eab3e17233339f2aa2b91850cf14fd3d6

Relecteur Opus, consigne LOT5 section R. Troisième relecture, après l'avis A CORRIGER au SHA 63536bfb69fd61024d6ae1c4bd616abeac18da69. Fiche lue sur origin/main (sensible : argent, cohérence des états).

## Défaut de l'avis précédent : vérifié par mutation
- Branche « version inconnue : aucun événement » (`frais-evenements.ts:58`) : elle est couverte par le nouveau test `version-inconnue-valider-aboutit-sans-evenement`. Si on retire la branche, le test rougit. Si on remplace l'absence d'événement par un événement en version 1, il rougit aussi. Corrigé.
- Journal : la ligne sur la version fixée à 1 est remplacée par le défaut de fiche (`versionDe` non branché dans `app.ts`). Corrigé.

## Pas de régression
- Depuis 63536bfb, seuls changent le test (1 test ajouté, 2 commentaires raccourcis), l'union de types mise sur une ligne, un commentaire retiré et le journal. Aucun test ni aucune assertion n'a été retiré, et le code ne change pas de comportement.
- Mutations des avis antérieurs, rejouées et toutes tuées :
  - échec de construction avalé dans `ecrireEtPublier` ;
  - `const version = 1` ;
  - `propose` en version 1 ;
  - retrait du filtre `d.statut === avant` ;
  - statut précédent ignoré.
- 8 tests du fichier verts ; `vitest apps/serveur` : 1294 tests verts (Node 22).

## Contrôles
- Fichiers : 5, tous dans `fichiers_autorises`. Taille : 238 ajouts et 12 suppressions = 250, à la limite de la fiche (250).
- Journal : 7 lignes, commence par `# Journal L11-T40`.
- Aucun secret, aucun prix, aucun mot interdit. Données fictives.

## Remarques (non bloquantes, pour Will)
- CI au SHA de tête : `tests` et `verifier` sont rouges. Ce n'est pas le fait de la PR. Seul `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`) échoue, et il échoue aussi en local sur `origin/main`. Les gardes sont vertes.
- Défaut de fiche : `versionDe` n'est pas branché dans `app.ts`, qui est hors fichiers autorisés. Les routes de validation ne publient donc pas encore `compta.frais.valide`.
- Renforcements toujours possibles : deux mutations survivent, sur du code inchangé.
  - Charge de `compta.frais.valide` sans `ecriture_id`.
  - `personne_id` faux dans `compta.remboursement.prepare`.
- Restent à trancher : `statuts.set` avant la fin de la transaction, statut précédent inconnu, état en mémoire non annulé, régularisation IK sans transition. Le point 2 du corps de la PR (« version fixée à 1 ») est périmé.
- Fiche sensible : fusion par Will seul. Pas de fusion par le relecteur.
