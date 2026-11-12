VERDICT: A CORRIGER

PR #1189 (L25-T07), relue au SHA e9969ed766b39112d47fe6cae2179a7bc5969919.

Vérifié : fichiers dans fichiers_autorises (5), 145 lignes <= 220, 7 tests nommés présents et verts, documents.ts inchangé, aucun mot interdit, aucun secret, aucun prix, données fictives. CI verte.
Mutations tuées : compte des clés de réponse, règle SCI, Object.freeze, refus document_absent, date d'approbation, tri des clés, organisation vide.

## Défaut
1. packages/noyau/src/abonnement/qualification.ts:56 : `Object.freeze` est superficiel. L'enregistrement « en ajout seul » reste modifiable après calcul de l'empreinte : `a.documents.push(...)` et `a.reponses.forme = 'SAS'` passent (vérifié : `Object.isFrozen(a.documents) === false`, `Object.isFrozen(a.reponses) === false`). L'empreinte ne correspond alors plus au contenu.
   Correction : geler aussi `reponses`, le tableau `documents` et chaque élément de `documents`. Test (dans `reponse-archivee-datee-avec-empreinte`) : `Object.isFrozen(a.reponses)`, `Object.isFrozen(a.documents)`, `Object.isFrozen(a.documents[0])` vrais ; le test doit rougir si l'on revient au gel superficiel.

## Remarques (non bloquantes)
- qualification.test.ts:59 : la boucle finale accepte n'importe quelle erreur (`not.toBeUndefined()`), même une erreur non métier (`autre`). Mieux : attendre `parametre_invalide` pour organisation et personne vides.
