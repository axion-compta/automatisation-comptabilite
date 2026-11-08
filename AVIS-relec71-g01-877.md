VERDICT: A CORRIGER
SHA relu : 59a483c2e3b9e22af2cdb2a92a4c82bb6a7f8f96
PR : 877 (branche pilotage/L11-T26-taille), `pilotage/fiches/L11-T26.md` (+3 −3).

## Vérifications
- `depend_de` + `L00-T63` : `garde:fiches` rouge sur la branche seule (« dépendance L00-T63 inconnue »), attendu tant que 876 n'est pas fusionnée ; avec la fiche L00-T63 ajoutée localement : 888 fiches cohérentes (phase P6 sur P0 admise).
- `taille_max_lignes: 400` = maximum de `garde:fiches` (`TAILLE_MAX = 400`).
- Piège : l'arrêt si L00-T63 n'a pas `statut: fait` sur main est utile.
- Aucun mot interdit, aucun prix, aucune donnée réelle.

## Défaut bloquant : 400 lignes ne tiennent pas pour la fiche telle qu'écrite
`pilotage/fiches/L11-T26.md:14` : l'auteur mesure environ 280 lignes de code hors `openapi.json`, SANS les tests. La fiche exige 11 tests nommés (dont `corps-invalides-400` avec 6 cas, idempotence, If-Match, 7 codes d'erreur) répartis entre `packages/contrat/src/__tests__/frais-actions.test.ts`, `apps/serveur/src/__tests__/frais-actions.test.ts` et `contrat.test.ts`, plus `frais.test.ts`, le journal (jusqu'à 11 lignes) et le passage `statut: fait` (2 lignes). Repère : L11-T24 (lecture seule) compte déjà 106 lignes de tests. Estimation : 280 + 130 à 200 de tests + 13 = 420 à 490 lignes, au-dessus de 400 sans aucune marge, et 400 est déjà le maximum. Relever la taille ne suffit donc pas.

Correction demandée : scinder L11-T26 en deux fiches, par routes (chaque moitié reste testable de bout en bout) :
1. **L11-T26** (garde l'id) : `POST /frais` (`creerFrais`) et `PATCH /frais/{id}` (`completerFrais`, `If-Match`) ; socle du service (état en mémoire, idempotence, version) ; branchement `app.ts` ; étape 4 sur `frais.test.ts`. Tests : `creer-depense-a-completer`, `creer-trajet-vehicule-societe-409`, `doublon-de-piece-409`, `completer-change-la-version`, `if-match-perime-412`, `frais-valide-non-modifiable-409`, `autre-personne-403`, `idempotence-meme-reponse`, `meme-cle-autre-corps-409`, `corps-invalides-400`.
2. **Nouvelle fiche L11-Tnn** (même lot, mêmes `fichiers_autorises` hors fiche et journal) : `POST /frais/{id}/payeur` (`repondrePayeur`, `FRAIS_PAYE_SOCIETE`) et `POST /vehicules` (`ajouterVehicule`). Tests : `payeur-banque-gagne-409`, un `autre-personne-403` sur le payeur, et un test nommé pour `ajouterVehicule` (succès + corps invalide), qu'aucun des 11 tests actuels ne couvre.

Dépendances : la nouvelle fiche dépend de L11-T26, et L11-T27 doit dépendre de la nouvelle fiche (`garde:fiches` refuse deux fiches du même lot qui partagent `routes.ts`, `openapi.json`, `app.ts`, `contrat.test.ts` sans dépendance). Mettre le hors périmètre des deux fiches à jour.

## Remarques
- Avec la scission, chaque moitié régénère environ la moitié des +469 lignes d'`openapi.json` ; la première peut rester près de 300. Garder `L00-T63` en dépendance de la première au moins, comme filet.
- Garder en `taille_max_lignes` une valeur réaliste pour chaque moitié (par exemple 340 et 260) plutôt que le maximum.
