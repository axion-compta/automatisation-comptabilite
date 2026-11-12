VERDICT: OK

PR #1109, fiche L16-T08, relue au SHA de tête 6b16dc57908ca238595c4ebbca8d3ba013bdec0c.
Relecture de la correction de l'avis A CORRIGER rendu au SHA 64638e9915790ba64aeb52627f374557eb2e0520.

## Contrôles
- Fichiers : les 6 sont dans `fichiers_autorises`. Taille : 259 lignes, limite 260.
- CI au SHA de tête : tout vert (verifier, gardes, tests, types, lint, stryker, e2e, gitleaks, licences).
- Localement (Node 22) : 9 tests verts ; gardes litteraux, textes, fictif et perimetre vertes.
- Aucun taux ni seuil en dur (100 % obtenu par `proportionPointsDeBase`) ; aucun prix ; aucun mot interdit ; données fictives ; journal de 5 lignes, il commence par `# Journal L16-T08`.
- Aucun test retiré depuis 64638e9 : les assertions sont regroupées en `toEqual` sur tableau, à valeur égale ou plus stricte (`raisons` passe de `toContain` à `toEqual`). Les 9 tests nommés sont présents.

## Défauts de l'avis précédent, vérifiés par mutation
1. Frontière de détention : corrigé. `detention >= detentionMin` -> `>` rougit (cas `detention: BAREME.detentionMin` ajouté).
2. `moisExercice` / `moisReference` : corrigé. Contrôle retiré -> rouge ; `m > 0` -> `m >= 0` -> rouge. `moisExercice: -6` lève `ErreurArgent`.
3. `detention` NaN, négative, au-dessus de 100 % : corrigé. Contrôle retiré -> rouge ; borne haute retirée -> rouge ; borne basse retirée -> rouge ; `d <= TOUT` -> `d < TOUT` -> rouge.
4. `resultat` NaN, Infinity, 1,5 : corrigé et figé. Les avaler en rendant 0 -> rouge.

## Remarques (non bloquantes)
- `impot-estime.ts:40` : trois mutants survivent sans changer le comportement visible : retrait de `Number.isInteger(m)` et de `bareme.moisReference` du contrôle (`fraction` refuse déjà ces cas, vérifié), et retrait de `Number.isInteger(d)` : là, `detention: 7500.5` serait accepté. Un cas de détention non entière dans `resultat-negatif-is-nul` le figerait.
- `impot-estime.ts:51` : `resultat` -Infinity ou -1,5 rend 0 sans erreur, car le test `resultat <= 0` passe avant toute validation ; `chiffreAffaires` NaN donne le taux normal sans `a_verifier`. Les deux arguments sont typés `Centimes`, donc l'entrée vient du code ; un contrôle `centimes()` en tête rendrait le refus uniforme.
- Remarques de l'avis précédent non traitées (arrondi du point mort avec reste, exercice de brouillons seuls) : l'auteur invoque la taille ; elles restent ouvertes.
- La PR amende sa propre fiche (signature `contexte`, 9e test, critère de garde, proratisation du plafond). Permis par `fichiers_autorises`, rien n'est affaibli. Fiche sensible (fiscalité) : fusion par Will seul.
