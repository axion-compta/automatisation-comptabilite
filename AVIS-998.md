VERDICT: OK
SHA relu : 3991858b5bbafd899fc4d3c1687581012f3aeaff

# Avis de relecture PR 998 (L08-T47, recette en CI). Fiche sensible, touche `.github/` : fusion par Will seul

Fiche lue sur origin/main. Relecture au SHA ci-dessus. Aucun défaut bloquant.

## Mutations à la main (dans `apps/serveur/src/exploitation/recette.ts`, appliquées puis annulées)
- `retour` rend `true` sans appeler `revenir` : `retour-n-vers-n-moins-1-sante-ok` échoue.
- `erreurs5xx: 0` forcé : `cinq-xx-au-dela-bloque` échoue.
- Le `catch` des étapes relance l'erreur : `etape-qui-leve-compte-comme-echec` échoue.
- Versions comparées comme des chaînes : `version-precedente-non-inferieure-refusee` échoue.
- `decision` accepte tout sauf `couper_et_proposer_retour` : aucun test n'échoue (voir les remarques).

## Contrôles
- Fichiers : 5, tous dans `fichiers_autorises`, dont `.github/workflows/version.yml`, que la fiche autorise. Aucune dépendance. Taille : 269 + 1 = 270 lignes, sous 300.
- `version.yml` : la tâche `recette` a `contents: read`, `timeout-minutes: 10` et `persist-credentials: false`. Les actions sont épinglées comme dans `sbom`, et `sbom` a `needs: recette`. Aucun `${{ }}` dans un `run:`, aucun déclencheur `pull_request` ajouté, `signer` n'est pas touché. `pnpm garde:ci` vert.
- Vitest : 9 tests verts sur 9, avec les noms de la fiche. `tsc --noEmit` vert. En local, `pnpm verifier` bute sur Node 22, et des tests hors PR sont lents sous la charge (relancés seuls, ils sont verts). La CI GitHub au SHA relu est verte.
- Essais, intervalle et seuil de 5xx sont lus dans `reglages`. L'horloge avance par `ajouterSecondes`. Aucune valeur légale en dur.
- Données fictives (« Écriture fictive A » et « B »). Aucun prix, secret ni mot interdit. Journal : 8 lignes, il commence par `# Journal L08-T47`.

## Remarques
- `recette.ts:124` : la fiche dit « seul `garder` réussit », mais aucun test ne distingue `garder` de `attendre`, et la mutation correspondante survit. Un test où `deciderApresDeploiement` rend `attendre` est à ajouter, dans cette PR ou dans la fiche de suite.
- `recette.ts:16-17` : `PortHote` a `version()` et `migrationAttendue()` en plus de la signature de la fiche. C'est noté au journal.
- `recette.ts:29` : l'option `restaurationPerdUneEcriture` est un crochet de test. Elle n'est acceptable que parce que l'hôte est fictif.
- Le journal (ligne 6) dit que sauter l'étape `retour` fait échouer 6 tests. Ce chiffre dépend de la façon de la sauter.
