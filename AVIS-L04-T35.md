VERDICT: OK

PR #1066, fiche L04-T35, SHA de tête relu : 655788e45d0f72e8aad651863e0c89cf498618b1

## Périmètre relu
Seul l'apport propre à la fiche a été relu (PR empilée sur #1058 L04-T33, encore ouverte, et #1059 L04-T34) : les 6 fichiers de `fichiers_autorises`, soit 163 lignes ajoutées pour 200 au plus. Aucun fichier hors liste dans cet apport. Les autres fichiers du diff viennent des PR amont.

## Vérifications
- Handler MSW `PATCH /pieces/:id/champs/:nom` appelé sur `correction-service.ts`, ajouté en fin de `handlersLot04` sans réordonner.
- Suite commune jouée sur les deux cibles : correction réussie, 404 champ et pièce inconnus, 400 valeur illisible (abc, NaN, Infinity, vide, corps incomplet), 409 pièce sensible, 400 sans en-tête idempotency-key, plus comparaison vrai/faux.
- Tests ciblés : `commun-correction.test.ts` 19/19 verts (Node 22). ESLint et `tsc -p packages/faux-serveur` sans sortie.
- Mutations (toutes rougissent, puis annulées) : retrait du handler du registre (10 échecs) ; 409 changé en 403 (2) ; contrôle de l'en-tête retiré (1) ; valeur illisible non convertie en BAD_REQUEST (4).
- Aucun mot interdit, aucun prix, aucune valeur légale en dur, données fictives. Journal de 7 lignes commençant par `# Journal L04-T35`.

## CI
La CI GitHub n'a pas tourné (panne générale) : avis rendu sur relecture du code et tests lancés en local. Rouge attendu sur `garde:termine` et `garde:perimetre` tant que #1058 n'est pas fusionnée : ce n'est pas un défaut de l'auteur.

## Remarques (non bloquantes)
- `suite-correction.ts` : le test `etat-neuf-entre-deux-cibles` passerait aussi avec un état partagé (corriger à 1,00 donne 100 quel que soit l'état antérieur). Mieux : corriger dans une cible, puis vérifier dans une cible neuve que la pièce a sa valeur d'origine.
- L'écart signalé par l'auteur vient de L04-T34 (déjà fusionnée) : le vrai serveur rend `BAD_REQUEST` non déclarée au lieu de `VALEUR_ILLISIBLE`. Le faux serveur le reproduit, et la comparaison vrai/faux le détectera quand il sera corrigé. À traiter dans une fiche du serveur.
