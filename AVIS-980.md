VERDICT: OK
SHA relu: 58b54302ba570c58aa66a8c1c4583f9947170609

PR 980, exécution de la fiche L00-T71 (sensible), branche lot-00/L00-T71, relecture Opus locale.

Vérifié :
- Fichiers touchés : exactement les 4 autorisés (pilotage/fiches/L00-T71.md, pilotage/fiches/L07-T19.md, pilotage/fiches/L15-T58.md, pilotage/journal/L00-T71.md). Base à jour avec main (bd5303a9, #979).
- L07-T19 : seul changement, ajout de apps/serveur/src/__tests__/abonnement-branchement.test.ts dans fichiers_autorises ; rien d'autre.
- L15-T58 : seul changement, ajout de apps/web/src/donnees/preferences.tsx et apps/web/src/donnees/__tests__/preferences.test.tsx dans fichiers_autorises ; rien d'autre.
- Ligne fichiers_autorises identique (même ordre) à celles des branches lot-07/L07-T19 et lot-15/L15-T58 : git diff ne montre plus que statut (a_faire -> fait, propre aux branches auteurs).
- git merge-tree de la tête 980 avec lot-07/L07-T19 et avec lot-15/L15-T58 : propre, sans conflit. Les PR 974 et 975 n'entreront plus en conflit.
- L00-T71 : statut a_faire -> fait, aucun autre champ modifié.
- Journal : 6 lignes (<= 10).
- Aucun autre élargissement.
- CI (gh pr checks 980) : 9/9 verts (e2e, gardes, gitleaks, licences, lint, stryker, tests, types, verifier).

Défauts : aucun.
