VERDICT: OK

PR #1160, fiche L20-T20, seconde relecture, tête relue : c3fc3a259b8caf422b900b586b0f131072f645f9

## Défaut précédent (avis sur b27d01c1) : levé
1. `packages/faux-serveur/src/domaines/tableau-de-bord.ts:43` : levé. `faux-serveur-meme-compteur` vérifie que chaque bloc autre que `a_faire` a exactement les `donnees` du service et ne porte pas `nombre`. Le mutant (retrait de `b.code === 'a_faire' &&` dans le `map`) est tué.

## Contrôles passés
- Les 6 fichiers sont dans fichiers_autorises ; 155 lignes sur 200 au plus ; aucune ligne « - - ».
- Les 3 tests nommés (et la variante « après une action ») sont verts : contrat 3/3, web 1/1.
- Mutants également tués : somme initialisée à 1, relecture `/compteurs` neutralisée, `nombre` retiré du bloc `a_faire`.
- Journal : 7 lignes, commence par « # Journal L20-T20 ». Aucun secret, prix ni mot interdit.
- Aucune régression : la correction ne touche que le fichier de test.

## Remarques (non bloquantes, déjà signalées)
- L'écran E01 (`Ecran.tsx`) affiche encore `enAttente.nombre`. V3-TDB-009 n'est donc pas visible à l'écran, et il faut une fiche de suite qui autorise `Ecran.tsx`.
- La branche `catch` du `fetch` interne n'est pas testée.
- CI : les jobs `tests` et `verifier` sont rouges, mais pas à cause de cette PR. Le test en échec est `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`, qui échoue aussi sur origin/main 347401ab.
