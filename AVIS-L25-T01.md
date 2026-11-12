VERDICT: OK
SHA relu : 9e768c84fb2a0bcf97f6e189da77a6ce37187d1f (PR #1146, fiche L25-T01)

## Vérifications
- Fichiers : les 6 fichiers modifiés sont dans `fichiers_autorises` ; diff 182 lignes (max 220).
- 14 tests passent (7 nommés de la fiche + 7 existants). `node outils/exploitation/mise-en-production.mjs` rend 0. CI : 9 jobs verts.
- Mutations : retrait du contrôle « liste vide », du contrôle de trou, du refus des doublons, du contrôle de `porte`, ajout de `oui` aux portes, `demo` remplacé par `rgpd` : un test rougit à chaque fois. `Number.isSafeInteger` remplacé par `!Number.isNaN` survit, mais c'est un mutant équivalent (la regex impose déjà un entier positif et le contrôle de trou refuse un très grand numéro).
- CSV : 25 points, `porte` migrée (oui→rgpd, non→lancement), point 13 sans « écartée », points 20 à 25 présents avec les portes demandées. Aucune virgule dans les libellés, aucun nom réel, aucun prix, aucun mot interdit.
- `docs/securite-differee.md` : date réelle en tête, mesures différées et points incompressibles.

## Remarques (non bloquantes)
- Deux tests nommés par la fiche L08-T05 (fait) sont renommés : `liste-initiale-19-ouverts` → `liste-initiale-ouverte`, `porte-rgpd-ouverte-si-8-a-14-et-16-coches` → `porte-rgpd-ouverte-si-les-points-rgpd-coches`. Le contenu est renforcé et l'ancien nom serait faux (25 points), mais la fiche L08-T05 cite toujours les anciens noms. À aligner par une PR de pilotage (Will).
- Aucune ligne de porte `demo` ⇒ `demoPublique: 'permise'` (même chose pour `rgpd`). La fiche l'admet ; plancher éventuel à décider par Will (signalé dans la PR).
- PR sensible : fusion par Will seul.
