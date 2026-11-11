VERDICT: OK
SHA relu : 73739de2f16d52eeba1fd7af1f5d3ac6a2f5d093

# Avis de relecture PR 993 (L07-T44), deuxième passage

Fiche lue sur origin/main (de38efd). Relecture au SHA ci-dessus. L'avis précédent (acd81b3) demandait trois corrections : elles sont faites. La demande de relecture classe cette PR parmi les fiches sensibles : la fusion revient à Will.

## Corrections vérifiées
1. Clés de montant dans les chaînes : `cleMontant` teste maintenant les chaînes (`contrat.mjs`). Le test `commercial-montant-dans-les-chaines` couvre `champs: ['prixUnitaire']`, `code: 'tarif_ia'`, un mode `stripe` et une opération `margeAjoutee`.
2. Bloc strict : une clé inconnue est refusée dans le bloc et dans un événement (hors `code` et `champs`). Le test `commercial-bloc-strict` couvre `remise: 5` et `extra: 1`. Le commentaire correspond au code.
3. Gel : `commercial` est gelé en profondeur (`gelerProfond`). Le test `commercial-gele-en-profondeur` vérifie l'objet, ses tableaux et `champs`.

## Mutations à la main (appliquées puis annulées)
- Retirer le test des chaînes dans `cleMontant` : `commercial-montant-dans-les-chaines` échoue.
- Retirer le refus des clés inconnues du bloc : `commercial-bloc-strict` échoue.
- Accepter la clé `extra` dans un événement : `commercial-bloc-strict` échoue.
- Remplacer `gelerProfond` par `Object.freeze` : `commercial-gele-en-profondeur` échoue.
- Rendre `gelerProfond` non récursif : `commercial-gele-en-profondeur` échoue.

## Contrôles
- Fichiers : 5, tous dans `fichiers_autorises`. Taille : 127 + 2 = 129 lignes, sous 200.
- Tests `outils/faux-hote-c4` : 39 verts. CI au SHA relu : les 9 contrôles sont verts.
- `pnpm verifier` en local : toutes les étapes sont vertes sauf `types`, qui bute sur la version de Node du conteneur (22 au lieu de 24). Ce n'est pas lié au code, et `types` est vert en CI.
- Aucun prix, aucun mot interdit, données fictives. Journal : 6 lignes, il commence par `# Journal L07-T44`.

## Remarques
- `CLES_MONTANT` s'applique aussi aux chaînes : un futur nom d'opération contenant « euro » ou « devise » sera refusé. C'est voulu, mais il faudra le savoir.
