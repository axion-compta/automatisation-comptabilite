VERDICT: OK

PR #1028 (L11-T28), SHA relu : c84afe04c4f85433acf65295bec5c45f2b2204ce.

L'avis A CORRIGER précédent n'est publié ni en branche `avis/L11-T28` ni en revue sur la PR. Le défaut vérifié ici est celui que traite le commit de correction c84afe04 : le test `etat-par-instance` était vide de sens.

Correction vérifiée par mutation :
- Mutation : l'état (`jeu`, services actions et validation) est sorti de `handlersFraisActions` pour être partagé au niveau du module.
  - Avec le test d'avant la correction (55ac832d), les 13 tests restent verts : avec la même clé d'idempotence, le rejeu renvoyait le même id, même quand l'état était partagé.
  - Avec le test corrigé (deux clés distinctes, `cle-instance-01` et `cle-instance-02`), `etat-par-instance` devient rouge. Défaut corrigé.
- Correctif CI 34c82e07 : `frais-actions.ts` n'importe plus rien de `apps/serveur` et ne lit pas `process`. Sa `configEssai` locale reprend exactement les valeurs d'essai par défaut du serveur (`apps/serveur/src/domaines/frais-validation.ts:12-22`).

Contrôles sur la tête :
- Fichiers modifiés : 6, tous dans `fichiers_autorises`. Taille : 216 lignes, limite 280. Le registre du lot 11 ne reçoit qu'un appel.
- `vitest run src/__tests__/commun-frais-actions.test.ts` : 13 tests passent sur les deux cibles. `registres.test.ts` : 7 tests passent (L00-T76 est sur main). ESLint et `tsc --noEmit` du paquet : aucune remarque.
- Autres mutations, chacune annulée ensuite :
  - `VERSION_PERIMEE` passé de 412 à 409 → `refus-412-version-perimee` rouge.
  - Clé d'idempotence non exigée → `refus-400-cle-absente` rouge.
- Journal : 7 lignes, commence par `# Journal L11-T28`. Aucun mot interdit, aucun prix, données fictives.

Remarques (non bloquantes) :
- `packages/faux-serveur/src/domaines/frais-actions.ts:15-23` : les seuils et délais d'essai sont recopiés du serveur. Ce sont des valeurs fictives du mode simulé, mais deux copies peuvent diverger : une fiche ultérieure pourrait les déplacer dans `donnees-fictives`.
- Mutation non détectée : si `POST /frais` n'exige plus `X-Personne`, aucun test ne rougit. Aucun refus « personne absente » n'est testé ; la fiche ne l'exige pas.
- `refus-409-bareme-a-verifier` accepte `BAREME_A_VERIFIER` ou `JUSTIFICATIF_MANQUANT`. L'écart du jeu d'essai du vrai serveur est expliqué dans le journal. Le cas reste plus faible que la fiche : à resserrer quand le jeu du serveur aura une carte grise.
