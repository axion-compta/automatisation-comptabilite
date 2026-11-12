VERDICT: OK

PR #1112, fiche L16-T09, SHA de tête 946a6582fedb2cb25226d64758871b0fc453e3cb

## Vérifications
- Fichiers : les 6 fichiers du diff sont dans `fichiers_autorises`. Taille : 279 lignes (275+, 4-) pour 300 au plus.
- Les 8 tests nommés sont présents et passent (vitest local, 8/8). CI verte au SHA de tête (gardes, tests, types, lint, verifier).
- `node outils/gardes/litteraux.mjs` : vert. Gardes fiches, termine, fictif, textes, tests : vertes en local.
- Aucune valeur légale en dur : seuils micro et franchise et pourcentage d'alerte lus par `parametreAuJour` (clés `micro.plafond.*`, `tva.franchise.seuil.*`, `alerte.seuil_pct` du catalogue L09-T26, mêmes formats). Test qui change la valeur lue et change le niveau.
- Temps gagné : sortie `{ minutes, mot: 'estimation', methode }`, aucun champ monétaire ; durées et méthode en argument ; NaN, négatifs et non entiers refusés (`Number.isSafeInteger`).
- Micro-entreprise en franchise ou non assujettie : aucun widget `tva`.
- Aucun prix, aucun mot interdit, données fictives. Journal : 5 lignes, commence par `# Journal L16-T09`.
- Mutations : franchise toujours affichée, widget TVA pour franchise, somme au lieu du produit, nombre négatif accepté : toutes détectées.
- Fiche sensible : fusion par Will seul.

## Remarques (non bloquantes)
- widgets-v1.ts:114 et :128 : chaque mutation isolée survit (`aVerifier: false` pour le plafond micro, ou suppression de la ligne 128 pour l'alerte), car le test passe les deux paramètres en `non_verifie` en même temps. Ajouter un cas plafond `valide` + alerte `non_verifie`, et l'inverse.
- widgets-v1.ts:83 : `Math.abs(avant)` jamais testé (aucune valeur N-1 négative) ; sans lui `proportionPointsDeBase` lève une erreur. Ajouter un cas N-1 négatif.
- `seriesMultiples` : une période à l'ordre inversé rend une liste vide au lieu d'une erreur.
