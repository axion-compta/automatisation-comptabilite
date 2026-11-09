VERDICT: OK
SHA relu : 2cd2797995ee504edfc6cb70371a167b5f4dc410
PR : 880 (branche pilotage/L11-T26-suite, supprimée depuis), fiche sensible L11-T26, `pilotage/fiches/L11-T26.md` (+4 −4). Elle répond au défaut bloquant 2 et à la remarque payeur de l'avis relec72-g01-877.
Constat : la PR est déjà fusionnée sur main (35acc4c). Le contenu fusionné est identique au SHA relu. Cet avis vaut relecture après coup.

## Vérifications
- Seul `pilotage/fiches/L11-T26.md` change.
- « L11-T42 » est remplacé aux deux endroits (Contexte et Hors périmètre) par « une fiche ultérieure du lot 11, à créer après L11-T38 à L11-T40 ». Plus aucune mention de L11-T42 dans `pilotage/fiches/`.
- Le test `completer-payeur-societe-garde` est ajouté. Il est réalisable : la règle 1 de `determinerPayeur` (`packages/noyau/src/frais/payeur.ts:41-42`) prime sur la déclaration `personne` et renvoie `payeur: societe`.
- Le critère passe à « 11 tests ». Le décompte donne bien 11 tests nommés.
- Cohérence avec L11-T27 et L11-T28 : routes réparties en 2 + 3 = 5, et les 5 handlers de L11-T28 (PR 879) correspondent. Le hors périmètre renvoie proposer, valider et rembourser à L11-T27 et le faux serveur à L11-T28. `FRAIS_PAYE_SOCIETE` reste dans L11-T27.
- Taille 340 avec 11 tests : relec72 estimait 310 à 370 pour 10 tests. Avec environ 8 lignes de plus, on arrive à 318 à 378. C'est tenable mais serré, comme déjà signalé. Ce n'est pas bloquant : `openapi.json` est compté à part, et 400 reste le plafond ultime.
- `garde:fiches` : 888 fiches cohérentes. `garde:textes` est vert. Aucun mot interdit (conforme, sans erreur, garanti, juriste, PDP), aucun prix.

## Remarques
- Le statut `exclu_paye_societe` est terminal (`packages/noyau/src/frais/statuts.ts:11`). Dans `completer-payeur-societe-garde`, le service ne doit pas appeler `passer` vers un autre statut. L'auteur doit vérifier que le statut reste `exclu_paye_societe` et que seule la version change. Ce point est à vérifier à la relecture du code.
- Si la taille dépasse 340, l'auteur doit s'arrêter et pousser `bloque/L11-T26`. Il ne doit ni relever le plafond lui-même ni retirer un test.
- La fusion d'une PR sensible a eu lieu avant que cet avis soit publié. Will doit en être informé.
