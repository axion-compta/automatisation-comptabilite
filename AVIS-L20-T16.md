VERDICT: A CORRIGER

PR n°1153, tête relue : 125cd3fe5947042eef643533d197d98de86ba755

## Défauts
1. packages/noyau/src/tableau-de-bord/flux.ts:42 (`listeValide(d.ca.deduire, true)`) : contrôle non testé. Mutations survivantes, vérifiées : remplacer par `true` (un préfixe vide `''` dans `deduire` est alors accepté et retire tous les comptes du CA), ou par `listeValide(d.ca.deduire)` (une liste `deduire` vide est alors refusée) : les 15 tests restent verts. Correction demandée dans flux.test.ts (bloc `it.each` des refus) : ajouter `{ ca: { prefixes: ['70'], deduire: [''] } }` refusé, et un cas où `deduire: []` est accepté avec le CA attendu.

## Vérifié
- Fichiers modifiés tous dans `fichiers_autorises` ; diff 219 lignes (max 220) ; journal 5 lignes, commence par `# Journal L20-T16` ; `chiffres.ts` inchangé.
- Tests ciblés : 15/15 verts. Mutations qui rougissent : borne de début de période (`>=` en `>`), ligne `non_classe` toujours ajoutée.
- Écritures non validées exclues (via `balance`) et testées (brouillon, proposée) ; bornes du mois à date, comparaison tronquée, perte négative testées.
- Préfixes en argument, aucun taux ni seuil en dur ; aucun secret, aucun prix, aucun mot interdit, données fictives. CI verte à la tête.
