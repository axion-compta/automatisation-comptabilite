VERDICT: A CORRIGER
SHA relu : f7dd65abec39911eb389b46d7f9570d19601957f

# Avis de relecture PR 997 (L15-T61, travaux de fond). Fiche sensible : fusion par Will seul

Fiche lue sur origin/main. Relecture au SHA ci-dessus.

## Défaut bloquant
1. `apps/serveur/src/travaux/__tests__/interface.test.ts:109-116`. Le test « écriture antidatée : instantanés invalidés puis recalculés, période voisine intacte » ne vérifie pas l'invalidation. Il appelle `x.monter()`, qui fait passer `versionEcritures` de 1 à 2 : les deux instantanés sont recalculés à cause de l'écart de version, qu'ils aient été invalidés ou non. Preuve : avec l'appel à `appliquerEvenement` (`evenements-interface.ts:68`) remplacé par une copie de la liste, les 8 tests restent verts. Le titre promet aussi « période voisine intacte », mais le test attend `['2026-03-01', '2026-04-01']`.
   Correction : ajouter un cas sans `x.monter()`, où la version reste égale. Il doit vérifier que `x.calculs` vaut `['2026-03-01']`, que l'instantané d'avril est inchangé et que la carte est ouverte. Corriger aussi le titre du test actuel.

## Mutations à la main (appliquées puis annulées)
- `appliquerEvenement` retiré : aucun test n'échoue (défaut ci-dessus).
- Plus de file par société dans `creerEvaluateur` : « évaluations concurrentes : aucune alerte en double » échoue.
- `e.version <=` remplacé par `<` : le test d'idempotence échoue.
- Plus de file dans le consommateur : « même événement livré deux fois en même temps » échoue.
- Carte toujours ouverte : « écriture hors période déclarée : aucune carte » échoue.
- `recalculerInstantanes` retiré : « écriture antidatée » échoue.

## Contrôles
- Fichiers : 5, tous dans `fichiers_autorises`. Taille : 299 + 1 = 300 lignes, juste à la limite. Aucune dépendance.
- Vitest : 8 tests verts sur 8. `tsc --noEmit` vert sur `apps/serveur`. eslint vert. `verifier.mjs --gardes` : 21 étapes vertes. En local, `pnpm verifier` bute sur Node 22. La CI GitHub au SHA relu est verte.
- Aucun mot interdit, aucun prix ni secret. Données fictives. Journal : 9 lignes, il commence par `# Journal L15-T61`.

## Remarques
- `evenements-interface.ts:66` : un événement d'écriture sans `charge.date` saute l'invalidation sans le signaler. Avec une date invalide, `appliquerEvenement` lève une erreur et l'événement sera relivré sans fin. Ces deux cas ne sont pas testés.
- `derniereVersion` est indexée par `objet_id` seul, sans le type de l'objet.
- La Map `files` de `creerEvaluateur` n'est jamais purgée.
- Le corps de la PR annonce 9 tests, il y en a 8.
- La fiche parle de tests « sur base de test ». Les tests utilisent des faux en mémoire : Will doit confirmer que cela suffit.
