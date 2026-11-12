VERDICT: A CORRIGER

PR n° 1207, tête relue : f9ae28e5446be4ba48a8544f33156dc1edacc16e
Relecteur Opus, 12/11/2026.

## Vérifié
- Fichiers : les 5 du diff sont dans `fichiers_autorises`. Taille : 246 lignes ajoutées, 1 retirée, sous le plafond de 250.
- `fflate` est déjà une dépendance de `packages/noyau` : aucune nouvelle dépendance.
- Tests ciblés : 7 sur 7 verts. Mots interdits, secrets, prix : aucun. Données fictives.
- Mutations tuées : bornes `debut <=` et `<= fin`, `estDateValide` sur la date du nom, `trim()` de la personne.

## Défauts
1. `packages/noyau/src/reprise/inventaire.ts:55-56` (`figer`) : l'objet `validation` n'est pas gelé. Constaté par une sonde : après `validerInventaire(inv, 'p', ...)`, l'affectation `v.validation.par = 'x'` réussit. La fiche demande que toute modification soit refusée après validation. Correction : `Object.freeze` sur `validation`, et dans `inventaire-valide-fige`, un test qui vérifie que la modification de `validation.par` lève une erreur.
2. `packages/noyau/src/reprise/types-document.ts:26` : le filtre MIME n'est pas testé. `^(video|audio)` et `^(image|video)` survivent tous les deux, car `photo-vacances.jpg` tombe en `a_classer` par son seul nom. Correction : tester `releve.jpg` en `image/jpeg`, ainsi qu'un nom classable en `video/...` et en `audio/...`, qui doivent tous rendre `a_classer`.
3. `inventaire.ts:93` : `Number.isNaN(Date.parse(horodatage))` remplacé par `false` survit. Correction : refuser `'2026-13-45T99:99:99Z'`, qui passe l'expression régulière mais donne NaN.
4. `inventaire.ts:38` (`DATE_DANS_NOM`) : retirer `(?<!\d)` ou `(?!\d)` laisse les tests verts. La date du nom n'est donc pas bornée, alors que c'était la correction de relecture annoncée. Correction : `n12025-01-15.pdf` et `2025011599.pdf` doivent rendre `exercice: null`.

## Remarques (non bloquantes)
- Les variantes `gl`, `fichier des ecritures` et `statuts?([^a-z]|$)` ne sont pas testées (`statutaire.pdf` rend bien `a_classer`).
- `reclasserLigne` reclasse toutes les lignes qui portent le même nom.
