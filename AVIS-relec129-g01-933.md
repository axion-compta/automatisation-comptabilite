VERDICT: OK
SHA relu : 958d914fc9193079230c19af6d3cafa1f92fad65

# Avis relec129-g01-933 : PR 933, fiche L15-T50 (branche lot-15/L15-T50)

## Contrôles
- Périmètre : 7 fichiers modifiés, tous dans `fichiers_autorises` (route, Ecran, CSS, test, textes e01, fiche, journal).
- Taille : 299 lignes ajoutées et 1 retirée ; le plafond de la fiche est 300 et celui du dépôt 400. Aucune ligne « - - ».
- Journal `pilotage/journal/L15-T50.md` : 7 lignes, commence par `# Journal L15-T50`.
- Aucun secret, aucune adresse ni port en dur, aucun prix, aucun mot interdit. Les données sont fictives (faux serveur `demarrerNoeud`, exercice `EX2026`). Règle 13 auteur3 respectée : lecture par interface, rien en production.
- Aucune garde, aucun test ni aucune règle de lint touchés. Aucune nouvelle dépendance. Schémas importés du contrat par chemin relatif, sans redéfinition. Aucun texte en dur dans les `.tsx`.
- La route `/mois` n'est déclarée par aucun autre écran (le menu et la commande « aller » y pointent déjà).
- Le mot `pieces_a_regarder` / `piecesEnDoute` correspond à ce que produit le noyau (`packages/noyau/src/tableau-de-bord/blocs.ts`, `blocTva`). L'en-tête `x-panne-bloc` est bien géré par le faux serveur.

## Tests lancés
- `vitest run apps/web/src/ecrans/e01` : les 9 tests nommés passent.
- `pnpm verifier` (Node 22 du cloud, avec `npm_config_engine_strict=false`) :
  - tests (698 fichiers), lint et gardes : verts ;
  - l'étape « types » échoue à cause de la version de Node (engines >=24), sans lien avec la PR. Lancée à part, `pnpm -r exec tsc --noEmit` passe.

## Mutations
- Montant affiché dans un bloc `impossible` : `tva-en-doute-aucun-montant` et `bloc-en-panne-les-autres-affiches` deviennent rouges.
- Montant modifié au front (`centimes + 1`) : `aucun-calcul-au-front` devient rouge.
- Événement renommé (`ouvrir` au lieu de `ouvrir-cloche`) : `trois-alertes-et-voir-tout` devient rouge.
- Suppression de `.slice(0, ALERTES_MAX)` : les tests restent verts (voir les remarques).

## Remarques (non bloquantes)
- `apps/web/src/ecrans/e01/Ecran.tsx:63` : le plafond de 3 cartes côté front n'est pas testé, car le faux serveur en renvoie déjà 3 au plus (AL-R5, `CARTES_DU_JOUR`). Il n'y a pas de risque tant que le contrat tient. Il serait plus solide de tester avec un corps de compteurs contenant 4 cartes ou plus.
- `apps/web/src/ecrans/e01/Ecran.tsx:33` : le cas « bloc absent de la réponse » n'est couvert par aucun test (la mutation `return null` reste verte). Le serveur renvoie toujours les blocs, donc le risque est faible.
- `apps/web/src/ecrans/e01/Ecran.tsx:73` : « Voir tout (N) » n'apparaît que si au moins une carte du jour existe. S'il y a des alertes ouvertes mais aucune carte du jour, le lien n'est pas affiché. C'est à confirmer avec la spec si besoin.
