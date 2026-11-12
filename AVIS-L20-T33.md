VERDICT: OK

PR #1203, fiche L20-T33, tête relue : 514ba0524f886fce337fdaa367f0a5a7ec705fe8

## Vérifications
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille 50 lignes (max 120).
- Tests nommés présents : `contrat-sans-route-d-emission`, `openapi-sans-route-d-emission`, `aucune-route-facture-abonnement` ; 5/5 passent en local (vitest).
- Aucun fragment ancien retiré ; `/abonnement/demandes-palier` reste permise.
- ADR 0008 au format des ADR existantes (titre, Statut, Date, Contexte, Décision, Conséquences).
- Aucun mot interdit, aucun prix ni montant, aucun secret, aucun nom réel.
- Mutations (toutes rougissent) : `&&` -> `||` dans la règle abonnement/factur (4 tests rouges) ; règle supprimée ; `FACTURE = 'facturation'` ; `ABONNEMENT = 'abonnements'`.

## Remarques (non bloquantes)
- `packages/contrat/src/__tests__/routes-emission-interdites.test.ts:20` : la règle porte sur chaque champ pris à part ; une route `{ chemin: '/abonnement/x', nom: 'lireFacture' }` (abonnement dans le chemin, factur dans le nom) n'est pas signalée par `routesInterdites`. Le test nommé couvre ce cas pour les routes réelles (concaténation nom + chemin), mais pas la fonction elle-même. Une prochaine fiche pourrait tester aussi la concaténation.
- Fragment `facturedabonnement` redondant avec la règle (mutant équivalent, noté au journal).
- CI : jobs `types`, `tests`, `lint`, `e2e`, `stryker` encore en cours au moment de la relecture ; `gardes`, `gitleaks`, `licences` verts.
- Fiche sensible : fusion par Will seul.
