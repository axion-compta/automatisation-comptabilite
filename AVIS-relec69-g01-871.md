VERDICT: OK
SHA relu : e56e946e0acabd3bb7752e5bbbdd3e0e019e3f07 (branche lot-01/L01-T47, PR 871, fiche L01-T47, second passage après l'avis relec67-g01-871)

## Suite donnée à l'ancien avis
1. Défaut 1 (fiche déjà réalisée) : corrigé. La fiche passe en `statut: fait`, « À faire » devient « Rien » avec les preuves, et les tests en double `plan.test.ts` et `tiers.test.ts` ne sont plus demandés.
2. Défaut 2 (import depuis `@axion/contrat`) : corrigé. La fiche parle désormais d'import par chemin relatif et explique pourquoi.
3. Remarque sur le Contexte : prise en compte (« n'ont plus de copie locale de l'enveloppe »).

## Points vérifiés
- Diff (`git diff --numstat origin/main...`) : `pilotage/fiches/L01-T47.md` (11 ajouts, 10 retraits) et `pilotage/journal/L01-T47.md` (8 ajouts, nouveau). Aucun fichier de code modifié (aucun fichier sous `packages/` ni `apps/`).
- Périmètre : `node outils/gardes/perimetre.mjs` en mode PR (fiche lue sur origin/main, taille 100) : vert, 2 fichiers, 29 lignes. La nouvelle liste (`reponses.test.ts`, fiche, journal) et la taille 60 restent cohérentes avec une clôture.
- Garde termine : `node outils/gardes/termine.mjs` vert (887 fiches). Le journal commence par `# Journal L01-T47` et fait 8 lignes. Les dépendances L01-T36, T37 et T38 sont `fait`. `tests_requis: oui` est tenu par `packages/contrat/src/__tests__/reponses.test.ts`, suivi par git et listé dans `fichiers_autorises`.
- `node outils/gardes/fiches.mjs` : 887 fiches cohérentes.
- Preuves du journal, contrôlées une à une sur la branche :
  - `plan.ts:32-33` : `ReponseExercices` et `ReponsePlan` ; `tiers.ts:15` : `ReponseTiers`, tous construits avec `enveloppe`.
  - Sorties des routes : `plan.ts:39` et `:51`, `tiers.ts:32`.
  - Imports des écrans : `n03/Ecran.tsx:1`, `n04/Ecran.tsx:3`, `e44/Ecran.tsx:2`.
  - Alias restant : `n03/Ecran.tsx:10` (`type Reponse = ...`), bien renvoyé hors périmètre.
  - `reponses.test.ts:17-46` : bornes, NaN, Infinity, non entiers, `body` absent, objet vide, cas valides, identité avec la sortie des routes.
- Tests : `pnpm --filter @axion/contrat exec vitest run` au vert ; `reponses.test.ts` : 4 tests au vert.
- Mutations refaites (puis annulées) : retirer `.min(0)` de `decalage` dans `plan.ts` fait rougir 2 tests, et retirer `.int()` de `total` dans `tiers.ts` en fait rougir 1. Le journal dit vrai.
- Aucun mot interdit, aucun prix, aucun octet NUL, aucune donnée réelle.

## Remarques
- `pilotage/fiches/L01-T47.md:2` : le titre (« exporter les schémas… et les utiliser ») décrit encore le travail initial. Ça ne bloque pas, puisque le Contexte dit que la fiche est close sans code.
- L'alias `Reponse` de `n03/Ecran.tsx:10` mérite une petite fiche à part, comme le propose la fiche.
