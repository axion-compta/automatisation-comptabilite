VERDICT: A CORRIGER
f12923489015c7f89ce39141615019ff6543bc44

PR #1081, fiche L14-T40 (sensible), SHA de tête relu : f12923489015c7f89ce39141615019ff6543bc44
Seconde relecture, après l'avis A CORRIGER du SHA d336feae. Fiche lue sur origin/main ; aucune PR de pilotage ouverte ne la modifie.

Le code reste juste. Le blocage vient toujours de la fiche : seul Will peut le lever.

## Défaut bloquant : NON corrigé (défaut de fiche, geste de Will)
1. `packages/contrat/src/__tests__/tva.test.ts:88`, cas `openapi-contient-les-routes-tva` : toujours rouge. Il attend `['get','get','get']` et reçoit en plus `put, post, post, put` (les 4 routes d'écriture demandées par la fiche). Reproduit en local (1 échec sur 6) et dans le job `tests` de la CI (seul échec du job), donc `verifier` rouge.
   - Ce fichier n'est toujours pas dans `fichiers_autorises` de L14-T40 sur origin/main ; l'auteur a eu raison de ne pas le toucher.
   - Correction : Will ajoute `packages/contrat/src/__tests__/tva.test.ts` aux `fichiers_autorises` (PR de pilotage). L'auteur filtre ensuite ce cas sur les routes de lecture et ajoute une assertion séparée pour les 4 routes d'écriture (ou met l'attente à `['get','get','get','put','post','post','put']`).

## Défaut non bloquant de l'avis précédent : corrigé
2. Identifiant vide : **corrigé**. `apps/serveur/src/__tests__/tva-ecriture.test.ts:99` et `:122` : ligne `''` et pièce `''` refusées en 400, sans ligne de journal ni changement d'état.
   - Mutation : `Identifiant` accepte la chaîne vide (`{0,64}`, `packages/contrat/src/domaines/tva-ecriture.ts:4`) → `sous-reserve-ligne-solide-409` et `rattachement-periode-deposee-409` rougissent.

## Vérifications au SHA de tête (Node 22)
- `tva-ecriture.test.ts` : 13/13. `garde:perimetre` vert en local (8 fichiers, 299 lignes + 262 lignes d'openapi.json). Gardes vertes en CI. Fusion avec main sans conflit.
- Le dernier commit ne touche que le test (et regroupe deux `creerApp(); apps.push(a);` sur une ligne). La fusion de main n'apporte que des fichiers déjà sur main.
- Aucun mot interdit, aucun prix, aucun secret ; données fictives.

## Remarques (reprises)
- État du service commun à tous les exercices (acceptable pour un état fictif injecté).
- Même `Idempotency-Key` sur une autre route → `DEJA_FAIT` : à documenter.
- Le test d'identifiant vide passe par `call()` (validation du contrat), pas par `inject` HTTP : suffisant pour la règle, l'URL `lignes//sous-reserve` n'est pas exercée.
