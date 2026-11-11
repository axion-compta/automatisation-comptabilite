VERDICT: A CORRIGER

PR #1058, fiche L04-T33, SHA de tête relu : 9af6c3f6f87b3b66293cad8b0bf9fc7a65390416

## Défauts

1. `packages/faux-serveur/src/domaines/depot.ts:19` : le faux serveur ne lit pas les fichiers comme le vrai serveur. Il lit `form.getAll('fichiers')`, alors que le vrai serveur (oRPC, notation à crochets) attend `fichiers[0]`, `fichiers[1]`… Sonde faite au SHA relu, même corps multipart envoyé aux deux cibles :
   - un seul fichier nommé `fichiers` : vrai 400, faux 200 ;
   - `fichiers[0]` : vrai 200, faux 400 ;
   - `fichiers[0]` + `fichiers[1]` : vrai 200, faux 400.
   Un écran (L04-T42) écrit contre le faux serveur échouera donc sur le vrai, et l'inverse.
   Correction demandée : lire les parties nommées `fichiers[<n>]` dans l'ordre des indices, comme le vrai serveur, et répondre 400 là où le vrai répond 400.
2. `packages/faux-serveur/src/__tests__/commun-depot.test.ts:36-39` : la suite commune n'envoie pas la même requête aux deux cibles (`fichiers[i]` au vrai, `fichiers` au faux). C'est ce qui cache le défaut 1.
   Correction demandée : construire un seul corps multipart (les mêmes noms de parties) pour les deux cibles, et ajouter un test commun qui envoie un seul fichier sous le nom `fichiers` et attend le même statut sur les deux cibles.

Les deux fichiers sont dans `fichiers_autorises`.

## Contrôles faits
- Fichiers modifiés : tous dans `fichiers_autorises`. Taille : 196 lignes (ajouts et retraits), sous le plafond de 250.
- Tests ciblés `commun-depot.test.ts` : 17 verts.
- Mutations (chaque fois le test rougit) : en-tête absent accepté (1 échec), relance 409 remplacée par 200 (1 échec), état inconnu 404 remplacé par 200 (2 échecs), handlers du dépôt retirés (9 échecs).
- Aucun mot interdit, aucun prix, aucun secret ; données fictives seulement (`exemple.fr`, `cle-fictive-*`).
- Journal : 7 lignes, commence par `# Journal L04-T33`.
- Aucun avis antérieur pour cette fiche.

## Remarques
- CI au SHA relu, terminée : jobs `gardes` et `verifier` rouges, les 7 autres verts. `gardes` est rouge pour « garde:termine » (L04-T31 n'était pas encore `fait` sur `main`). Ce n'est pas un défaut de l'auteur. L04-T31 est passée à `fait` depuis (#1055) ; la branche doit être remise à jour sur `main` pour relancer la CI.
