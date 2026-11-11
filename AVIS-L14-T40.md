VERDICT: A CORRIGER

PR #1081 (L14-T40, fiche sensible), relue au SHA de tête d336feae6ac16f60b76f7b583179445570a805c9. Fiche lue sur origin/main ; aucune PR de pilotage ouverte ne la modifie.

Le code est juste. Le blocage vient de la fiche : seul Will peut le lever.

## Défaut bloquant (défaut de fiche, geste de Will)
1. `packages/contrat/src/__tests__/tva.test.ts:88`, cas `openapi-contient-les-routes-tva` : rouge (le job `tests`, donc `verifier`, échoue). Il attend `['get','get','get']` sur les chemins `/tva/` et reçoit en plus `put, post, post, put`, c'est-à-dire les 4 routes d'écriture que la fiche demande d'ajouter au domaine `tva`. Reproduit en local (1 échec sur 6). Ce fichier n'est pas dans `fichiers_autorises`, et l'auteur a eu raison de ne pas le toucher.
   Correction : Will ajoute `packages/contrat/src/__tests__/tva.test.ts` aux `fichiers_autorises` de L14-T40 (PR de pilotage). L'auteur met ensuite l'attente à `['get','get','get','put','post','post','put']`, ou mieux, filtre ce cas sur les routes de lecture et ajoute une assertion séparée pour les 4 routes d'écriture.

## À ajouter lors de la reprise (non bloquant seul)
2. `apps/serveur/src/__tests__/tva-ecriture.test.ts` : la fiche (§5, cas limites) exige « identifiant vide », qui n'a pas de test. Ajouter par exemple `inject` sur `/exercices/exercice-fictif/tva/lignes//sous-reserve` et `.../pieces//rattachement` avec un statut 4xx attendu, sans aucune ligne de journal.

## Vérifications faites
- Périmètre : 8 fichiers, tous autorisés. `garde:perimetre` vert en local (299 lignes + 262 lignes d'openapi.json, limite 300). `garde:termine` vert. Fusion avec main sans conflit.
- Critères : 13 tests nommés verts ; routes-paiement-interdites, routes-sans-virement et routes-interdites verts (51 tests) ; `pnpm contrat:diff` identique ; `routesEcritureSansEnTete()` reste `[]` (identite.test.ts vert) ; tsc propre.
- Mutations (annulées ensuite) : écriture de la ligne de refus retirée → `t1-reglage-refuse-quel-que-soit-le-role` et `reglage-valeur-false-aussi-refuse` rougissent (critère de la fiche) ; contrôle `DEJA_FAIT` retiré → `payee-autre-cle-409` ; refus IA retiré → `sous-reserve-par-ia-403` ; rejeu de clé retiré → `payee-meme-cle-meme-reponse` ; `PERIODE_BLOQUEE` retiré → `payee-periode-en-doute-409` ; 401 retiré → `serveur-par-defaut-refuse-401`. Chacune rougit.
- Le refus du réglage ne dépend d'aucun rôle ni d'aucune option. L'acteur vient du port de session, jamais d'un en-tête. Aucune route ni aucun operationId ne contient paiement, payer ou virer. Données fictives, aucun montant réel, aucun mot interdit.

## Remarques
- Le service garde un seul état pour tous les exercices (le paramètre `exercice` ne sert qu'à l'empreinte). C'est acceptable pour un état fictif injecté, à revoir avec la vraie persistance.
- Une même `Idempotency-Key` réutilisée sur une autre route donne `DEJA_FAIT` : comportement prudent, à documenter dans la fiche de suite du faux serveur.
