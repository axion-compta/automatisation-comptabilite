VERDICT: OK

# Avis relec87-g01-891 — PR 891, fiche L07-T16

SHA relu : af645aba28c5f42bd23697e66420f4b812a5b798
Branche : lot-07/L07-T16

## Vérifications
- Périmètre : les 10 fichiers modifiés figurent dans `fichiers_autorises`.
- Taille : 153 lignes ajoutées, 1 supprimée (limite 250) ; aucune ligne « - - » dans `git diff --numstat`.
- Contrat entre fiches : `OptionsAbonnementFaux` (base, horloge, scenarioParDefaut, attendre), `handlersAcces`, `handlersVolume`, `handlersPalier`, `handlersFinContrat`, `handlersAcceptations` présents avec la signature demandée.
- Les 9 routes (méthode et chemin) correspondent à `packages/contrat/src/domaines/*.ts` ; `/fin-contrat/gel/levee` est déclaré avant `/fin-contrat/gel`.
- `handlers.ts` : ajout de `scenarioAbonnement` et `horloge`, branchement unique avec la même `base` et la même latence ; rien d'autre ne change.
- La fonction d'erreur est recopiée à l'identique (`erreurAbonnement`).
- Les 5 tests nommés sont présents ; `neuf-routes-interceptees` n'exige pas 501 et contrôle les requêtes non gérées.
- Données fictives (exemple.fr, localhost) ; aucun prix, aucun secret, aucun mot interdit.
- Journal : 5 lignes, commence par `# Journal L07-T16`.

## Exécution
- vitest `packages/faux-serveur` : 7 fichiers, 283 tests réussis.
- `pnpm verifier` (Node 22, engine-strict désactivé) : lint, tests (685 fichiers, 6345 tests) et gardes au vert. L'étape « types » échoue seulement sur la version de Node ; `pnpm -r exec tsc --noEmit` relancé à part passe.

## Mutations rejouées (puis annulées)
1. Retrait de `handlersVolume` du branchement : `neuf-routes-interceptees` et `base-appliquee` rougissent.
2. Option prioritaire sur l'en-tête : `entete-scenario-prioritaire` rougit.
3. `base` ignorée (hôte figé) : `base-appliquee` rougit.
4. Scénario absent rendu `''` au lieu de `null` : `scenario-absent-null` rougit.
5. `gel/levee` et `gel` remplacés par un motif `/fin-contrat/gel*` : les tests restent verts (voir Remarques).

## Remarques (non bloquantes)
- L'ordre de déclaration `gel/levee` puis `gel` n'est pas couvert par un test. Sans effet tant que tout répond 501 ; à couvrir quand L07-T19 ou L07-T20 donnera des réponses différentes aux deux routes.
