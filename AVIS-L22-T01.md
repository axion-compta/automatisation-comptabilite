VERDICT: A CORRIGER

PR #1168 (L22-T01, code). Tête relue : 44500b3d1073dc7ba891ee2757030f009b64a3b3
Relecteur Opus, consigne LOT5 section R. L'avis précédent sur cette branche portait sur la PR de conception #1139 ; c'est la première relecture de la PR de code.

## Vérifié
- Fichiers : les 10 fichiers du diff sont dans `fichiers_autorises`. Taille : 220 lignes ajoutées et 3 supprimées (maximum 250), aucune ligne « - - ».
- Les 7 tests nommés existent et passent en local : parametres 13/13, noyau 21/21. CI entièrement verte (gardes, tests, types, lint, stryker, e2e, gitleaks, licences, verifier).
- Aucune date en dur dans `references.ts` ni dans `franchise-mention.ts`. Les bornes `fin` sont exclues. Un numéro CIBS non confirmé reste `null` et donne `reference_inconnue`.
- Mutations tuées : `<` remplacé par `<=` sur la bascule, retrait du garde `articleCibs === null`, retrait des tolérées, retrait du test `length === 0` (une liste vide lève une exception), et `every` remplacé par `some`.
- Aucun secret, aucun prix, aucun mot interdit. Données fictives. Journal de 8 lignes.

## Défauts
1. `packages/noyau/src/controles/regles/franchise-mention.ts:65` : `sourceAVerifier` est calculé sur toutes les mentions admises, citées et tolérées, et non sur la mention réellement trouvée. Cas reproduit en local : une facture du 2027-02-15 lit la mention CGI, la tolérance est `a_verifier` et la mention CIBS `valide`. Le résultat est `{ resultat: 'OK' }` au lieu de `source_a_verifier`. Le statut « à vérifier » de la tolérance est perdu dès que la ligne CIBS sera validée, alors que la fin de tolérance reste incertaine. Correction : quand une mention est trouvée, déduire `source_a_verifier` des seules mentions trouvées (par exemple `trouvees.every((m) => m.statut !== 'valide')`). Ajouter un test de ce cas : CIBS `valide`, tolérance `a_verifier`, CGI lu → `{ resultat: 'OK', valeur: 'source_a_verifier' }`.
2. `packages/noyau/src/tva/references.ts:37` : on peut remplacer `statut: ligne.statut` par `statut: 'a_verifier'` dans la branche CGI sans qu'aucun test ne rougisse. Correction : dans `statut-repris-de-la-ligne`, ajoute un cas avant la bascule, par exemple `citerReference('A', '2029-12-31', t)` → `{ texte: 'art. A du CGI', statut: 'valide' }`.

## Remarques
- La fiche demande des tests « sur le VRAI catalogue ». Les tests nommés de CC-T13 utilisent des textes fictifs, car `@axion/noyau` ne dépend pas de `@axion/parametres` et la fiche n'autorise aucune nouvelle dépendance. Le vrai catalogue n'est vérifié que dans `is-societes.test.ts` et `cgi-cibs.test.ts`. C'est acceptable, à signaler à Will.
- Fiche sensible : fusion par Will seul.
