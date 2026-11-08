VERDICT: A CORRIGER
SHA relu : e1e0cb4dd1bdfd435b537dda4b55f79ac78b1023
PR : 877 (branche pilotage/L11-T26-taille), fiche sensible L11-T26, `pilotage/fiches/L11-T26.md` (+9 −9). Suite de l'avis relec71-g01-877.

## Vérifications
- Diff contre `origin/main` : seul `pilotage/fiches/L11-T26.md` change (L11-T42 et L11-T27 retirés par e1e0cb4, une fiche par PR). Branche à jour avec main.
- `garde:fiches` : 888 fiches cohérentes (avertissements seulement, aucun sur L11-T26). `garde:textes` vert.
- Aucun mot interdit (conforme, sans erreur, garanti, juriste, PDP), aucun prix, aucune donnée réelle (`X-Personne` fictif).
- Réduction demandée par relec71 faite : `creerFrais` et `completerFrais` seulement, 10 tests nommés repris exactement de relec71, critère « 10 tests », `FRAIS_PAYE_SOCIETE` retiré des erreurs de la fiche, `depend_de` + `L00-T63`.
- `L00-T63` est sur main avec `statut: a_faire` (fiche fusionnée, pas encore exécutée). Le piège « vérifier statut = fait sinon bloque/L11-T26 » couvre ce cas. Il reste utile.
- `openapi.json` à part : `perimetre.mjs` compte `lignesOpenapi` à part (plafond 300 aujourd'hui, 600 après L00-T63). Repère : L09-T35 (2 routes d'écriture) = +146. Ici, avec l'union dépense/trajet, `FraisDetail` développé et 6 codes d'erreur : environ 200 à 280 lignes. Cela tient sous 600 et sans doute sous 300. Le portier ne s'applique pas (fiche sensible, fusion par Will).

## Estimation détaillée de la taille (hors openapi.json)
Repères mesurés : L09-T35 (2 routes, en mémoire, 7 tests) = 285 lignes, dont 151 de tests ; L11-T24 = 106 lignes de tests.
- `contrat/domaines/frais-actions.ts` : corps créer (union dépense/trajet) ~20, corps compléter ~8, en-têtes `If-Match` / `X-Personne` ~6, 2 routes avec 6 erreurs ~20, imports et export ~8 (réutilise `FraisDetail`) : **60 à 70**.
- `frais-actions-service.ts` : état et version depuis `genererFrais()` ~12, idempotence (clé, empreinte du corps, 409) ~15, créer (doublon, véhicule société, payeur, manquants, statut, invariants) ~30, compléter (404, 403, 412, 409 valide, recalcul) ~30, erreurs ~8 : **90 à 105**.
- Serveur `domaines/frais-actions.ts` ~22, `app.ts` +3, `routes.ts` +2 : **~27**.
- Tests : 10 tests, `corps-invalides-400` en table (6 cas) ~15, fixtures ~15, ~11 lignes par test ailleurs : **120 à 150**, plus `contrat.test.ts` 0 à 3.
- `frais.test.ts` 2, journal ≤ 10, `statut: fait` 2 : **~14**.
- Total : **310 à 370**, centre vers 340. La taille 340 est réaliste mais serrée. Ce n'est pas bloquant : 400 reste possible en dernier recours.

## Défauts bloquants
1. **L11-T28 a besoin de la route payeur, retirée ici.** `pilotage/fiches/L11-T28.md` (titre, À faire 1 et 3) demande les « handlers MSW des 7 routes » et un scénario « créer → compléter → payeur → proposer → valider → rembourser ». Après la réduction, L11-T26 et L11-T27 ne fournissent que 5 routes. L11-T28 devient inexécutable telle qu'écrite. De plus, L11-T38 dépend de L11-T28, et la fiche payeur/véhicules devrait dépendre de L11-T38 à T40 : on a donc un cycle. La fiche payeur ne pourra jamais précéder L11-T28. C'est le cas « une autre fiche a besoin de ces routes » prévu par la consigne.
   Correction demandée : par une PR de fiche séparée (une fiche par PR), fusionnée avant ou avec 877, réduire L11-T28 à 5 routes. Elle porterait le scénario « créer → compléter → proposer → valider → rembourser » et les mêmes refus (le 409 « payé par la société » reste possible par `proposerFrais`, L11-T27). Dans son hors périmètre, renvoyer payeur et véhicules à la fiche ultérieure.
2. **Renvoi à une fiche inexistante.** `pilotage/fiches/L11-T26.md:20` et `:30` citent « L11-T42 ». Cette fiche n'existe pas sur main ni dans la PR, et la garde refuse aujourd'hui de la créer. L'id peut être pris par une autre fiche entre-temps.
   Correction : remplacer par « une fiche ultérieure du lot 11, à créer après L11-T38 à L11-T40 », sans numéro, aux deux endroits.

## Remarques
- La fiche L11-T26 est sensible (« argent : qui a payé »). Le test `payeur-banque-gagne-409` est parti avec la route payeur. Pourtant `completerFrais` permet toujours de compléter le payeur. Conseil : `completer-change-la-version`, ou un test court, devrait vérifier qu'un `PATCH` avec payeur `personne` sur un frais rapproché d'une ligne de la société laisse `payeur = societe` (règle de `determinerPayeur`, L11-T04). Cela coûte environ 8 lignes, à prévoir dans 340.
- `pilotage/fiches/L11-T24.md:29` (statut fait) attribue encore `POST /vehicules` à L11-T26. C'est périmé mais sans effet. À corriger avec la future fiche payeur et véhicules.
- La PR totale (environ 340 + environ 250 d'openapi) dépasse 400 lignes. C'est admis par le schéma validé dans L00-T63 (openapi compté à part). À rappeler à Will lors de la fusion.
