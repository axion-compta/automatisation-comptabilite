VERDICT: OK

PR #1126 (L16-T42), SHA de tête 7872794cd03c03a45f430d3fc11773269d81e5f9 (branche lot-16/L16-T42). Relecture du 12/11/2026 après l'avis A CORRIGER sur 6fc453ec217f5dce7ae1531cb9da41b997f0a1f9. CI 9/9 verte sur ce SHA (verifier, gardes, types, lint, tests, e2e, stryker, gitleaks, licences).

## Contrôles
- 4 fichiers, tous dans `fichiers_autorises` ; 160 lignes ajoutées et 3 retirées (max 200).
- 8 tests verts en local, dont les 5 nommés par la fiche ; eslint, tsc et garde périmètre verts.
- Journal 7 lignes, commence par `# Journal L16-T42`. Aucun mot interdit, aucun prix, données fictives.
- `normaliser` importé ; TVA déductible via `effetTraitement` (code `MARGE`), sans recalcul.

## Défauts de l'avis précédent, vérifiés par mutation
1. TVA jugée sur `piece.totaux.tva` : corrigé, chaque ligne d'occasion est jugée sur sa TVA. Remettre `piece.totaux.tva` : 1 test rouge (facture mixte, deux ordres de lignes).
2. `some` -> `every` : 1 test rouge.
3. Normalisation des natures : retrait de `.map(normaliser)` (réglage) ou de `normaliser(l.nature)` (pièce) : 1 test rouge chacun.
4. Cas limites : retrait de `exigerCentimes` sur la TVA de ligne, sur `totaux.tva` ou `totaux.ht` de `tvaDeductibleMarge` : 1 test rouge chacun (NaN, Infinity, 1.5). Pièce sans ligne -> `NON_APPLICABLE` : retrait du garde, 2 tests rouges.
Mutation de plus : retrait de la branche « mention lue » : 1 test rouge.

## Remarques
- `CC-T10-OCCASION` n'est pas au catalogue des contrôles (hors périmètre de la fiche, à prévoir dans une fiche).
- Avec la mention lue, la règle rend `OK` même si une ligne d'occasion porte de la TVA ; seule `tvaDeductibleMarge` (0 déductible) couvre ce cas. Acceptable au regard de la fiche.
- Fiche sensible : pas de fusion par le relecteur, fusion par Will seul.
