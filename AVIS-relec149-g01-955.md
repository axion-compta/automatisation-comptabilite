VERDICT: OK
SHA relu: ec8474f8bf2935be8598ca7899bf8a0521c95e81

# Avis relec149-g01-955 — PR 955, fiche L14-T41 (sensible, relecture stricte)

## Vérifié
- Fichiers modifiés : les 6 fichiers sont tous dans `fichiers_autorises` ; aucun autre fichier touché.
- Taille : 292 lignes ajoutées, 1 retirée (limite 300) ; aucune ligne « - - » dans `git diff --numstat`.
- Tests : 8 tests nommés du noyau et 6 du serveur présents, noms identiques à la fiche, 14/14 au vert en local.
- Mutations (toutes annulées ensuite), chacune fait rougir un test :
  - empreinte calculée sur le document en mémoire au lieu des octets rendus → `s1-empreinte-recalculee-identique` rouge ;
  - écrasement d'une archive existante aux octets différents → `octets-differents-jamais-ecrases` rouge ;
  - suppression du refus « date avant la validation » → `cas-limites-entree` rouge ;
  - archivage sans validation côté serveur → `archive-refusee-sans-validation` rouge ;
  - seconde écriture à la relance → `relance-memes-octets-idempotente` rouge.
- Archive non modifiable après coup : un nom déjà archivé avec d'autres octets est refusé (`archive_existante`), les mêmes octets rendent l'entrée existante sans seconde écriture.
- Validation lue seulement via `PortValidations`, jamais déduite d'un filigrane ; aperçu avec filigrane `a_valider`, sans écriture.
- Aucun import de `apps/serveur/src/ia` ni de bibliothèque PDF ; aucune nouvelle dépendance.
- Données fictives (SIREN 987654324, « Camille Exemple », dates inventées) ; aucun prix, aucun mot interdit, aucun secret, aucun octet NUL.
- Journal : 7 lignes, commence par `# Journal L14-T41` ; fiche passée à `statut: fait`.
- CI sur le SHA de tête : verifier, tests, types, lint, gardes, e2e, stryker, licences, gitleaks au vert.

## Remarques (non bloquantes ici, à porter par les fiches de suite)
1. Isolation entre sociétés — `apps/serveur/src/juridique/archive-rapports.ts:7-14` et `packages/noyau/src/juridique/archive-rapport.ts:71` : la clé d'archive (`rapport-<type>-<exerciceId>.pdf`), `PortArchive.lire(nom)` et `PortValidations.lire(exerciceId, type)` ne portent pas de société, alors que le schéma de la base indexe les exercices par `(societe_id, exercice_id)` : un `exerciceId` n'y est donc pas unique. Ce code suit à la lettre les signatures de la fiche et n'expose aucune lecture (ni route ni stockage réel) : aucune fuite possible aujourd'hui. Mais les fiches de suite (stockage chez l'hébergeur, route de téléchargement, branchement de `PortValidations`) devront soit fournir des ports propres à une seule société, soit ajouter `societeId` à la clé, à `EntreeArchive` et à `PortValidations.lire`, avec un test « même exerciceId, deux sociétés : B ne lit jamais l'archive ni la validation de A ».
2. `archive-rapports.ts:34-39` : `lire` puis `ecrire` ne sont pas atomiques. Le « jamais d'écrasement » dépend du futur `PortArchive.ecrire`, qui devra refuser l'écriture si le nom existe déjà (création seule, pas de remplacement).
3. `archive-rapport.ts:67` : si `validation.le` est mal formé, le contrôle « archive pas avant la validation » est sauté et la date mal formée est archivée dans `valideLe`. Risque faible (la validation viendra du service de L14-T39), mais un refus `date_invalide` serait plus sûr.
4. `archive-rapport.test.ts:41` : `validation-incomplete-refusee` vérifie la classe `ErreurMention` sans vérifier le code `validation_incomplete`.
