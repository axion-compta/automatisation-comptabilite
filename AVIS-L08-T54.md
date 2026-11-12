VERDICT: A CORRIGER
SHA: 42169633daa957b2e80b0141880aa855135e8112
PR: #1085

Fiche L08-T54 (**sensible** : fusion par Will seul), relue au SHA de tête 42169633daa957b2e80b0141880aa855135e8112 (relecteur Opus). L'avis précédent était A CORRIGER au SHA 62de13a6 : historique sans ancêtre commun avec main, code absent. `pilotage/ARRET` absent sur origin/main.

## Défaut du 62de13a6 : corrigé
- 8feca732 fusionne origin/main (fb2f2ff4) avec `--allow-unrelated-histories`. Depuis, `git merge-base origin/main HEAD` rend fb2f2ff4, c'est-à-dire main actuel. Mergeable « clean ».
- `git diff origin/main HEAD` porte sur 3 fichiers seulement, tous dans `fichiers_autorises`. Taille 198 + 4 = 202 lignes, pour une limite de 220. Aucune ligne binaire.
- CI verte à cette tête (run 43164723960) : verifier, tests, e2e, gardes, types, lint, licences, gitleaks, stryker.

## Comparaison fichier par fichier avec la version relue OK (33e6de97, `lot-08/L08-T54-reprise`, PR #1082)
- `packages/noyau/src/rgpd/exercice-violation.ts` : identique.
- `packages/noyau/src/rgpd/__tests__/exercice-violation.test.ts` : identique.
- `pilotage/journal/L08-T54.md` : identique (7 lignes, commence par `# Journal L08-T54`).
- `pilotage/fiches/L08-T54.md` : **différent**. Dans 33e6de97, la fiche passait à `statut: fait`. À cette tête, elle est restée celle de main (`statut: a_faire`), et la PR ne la modifie plus.

## Défauts à corriger
1. `pilotage/fiches/L08-T54.md:8` : remettre `statut: fait` (étape 5 de la fiche ; `pilotage/consignes/auteur.md` point 5). Sinon, une fois la PR fusionnée, la fiche reste `a_faire` et `garde:termine` bloque les fiches qui en dépendent (voir la consigne S du lot 5). Correction d'une ligne, sur la branche, par une fusion normale : pas de force-push.
2. Corps de la PR : il manque la ligne `Fiche: L08-T54` et les IDs d'exigences (V3-PLA-126, V3-PLA-129, V3-PLA-179, V3-SEC-004), exigés par CLAUDE.md. Le corps renvoie aussi à « même contenu (SHA 33e6de97) », ce qui n'est vrai qu'une fois le point 1 corrigé.

## Vérifié sur le code (inchangé par rapport à la relecture OK)
- Tests ciblés à cette tête : `exercice-violation.test.ts`, `violations.test.ts` et `securite/__tests__/arret.test.ts`, soit 3 fichiers et 25 tests au vert. Les 9 tests nommés de la fiche sont présents.
- Quatre mutations, toutes annulées, chacune rougit 1 test : retrait du refus global ou d'une autre société (l. 43) ; retrait de `reprise_absente` (l. 70) ; borne de l'exercice décalée de 1 s (l. 49) ; retrait du refus « actions sans événement d'arrêt » (l. 53).
- Aucun « 24 » dans `src` (la limite est passée en argument ; seul le test l'écrit). Aucun mot interdit, aucun prix, aucun nom réel ni e-mail.
