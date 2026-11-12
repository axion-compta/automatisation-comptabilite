VERDICT: A CORRIGER

PR #1109, fiche L16-T08, relue au SHA de tête 64638e9915790ba64aeb52627f374557eb2e0520.
Avis d'audit V1 (dépôt privé) non accessible depuis cette session : jugé sur la fiche (origin/main) et sur l'amendement de fiche porté par la PR.

## Contrôles
- Fichiers : les 6 sont dans `fichiers_autorises`. Taille : 254 + 6 = 260 lignes, pile la limite de 260.
- CI verte au SHA de tête (verifier, gardes, tests, types, lint, stryker, e2e, gitleaks, licences).
- Localement : 9 tests verts (Node 22) ; gardes litteraux, textes, fictif et perimetre vertes.
- Aucun taux ni seuil en dur ; aucun prix ; aucun mot interdit ; données fictives ; journal de 5 lignes, il commence par `# Journal L16-T08`.
- Mutations : `chiffreAffaires <` -> `<=` rouge ; arrondi `demi-superieur` -> `inferieur` rouge ; `marge <= 0` -> `< 0` rouge. Survivantes : voir les défauts 1 et 4.

## Défauts
1. `packages/noyau/src/tableau-de-bord/impot-estime.ts:49` : la mutation `contexte.detention >= bareme.detentionMin` -> `>` passe tous les tests. Le seuil de détention n'est pas testé à la frontière (seuls 7499 et 10000 sont testés). Ajouter dans `taux-reduit-jusqu-au-plafond` un cas `detention: bareme.detentionMin` qui garde le taux réduit.
2. `impot-estime.ts:51-53` : `moisExercice` n'est pas contrôlé. Avec `moisExercice: -6`, la fonction rend `partieReduite: -2125000` et un montant de 462500 au lieu de refuser l'entrée : un impôt faux, sans alerte. Refuser (ErreurArgent ou erreur dédiée) un `moisExercice` non entier ou ≤ 0, et `moisReference` ≤ 0. Test qui rougit sans le contrôle.
3. `impot-estime.ts:37,48` : une `detention` NaN, négative ou au-dessus de 10000 points de base est prise pour une valeur connue : avec NaN on a le taux normal et `aVerifier: false`, avec 20000 le taux réduit. Refuser ces valeurs, ou les marquer `detention_inconnue` / `a_verifier`. Test qui rougit sans le contrôle.
4. Cas limites demandés par la consigne : aucun test de `resultat` NaN, Infinity ou non entier. Le code lève bien `ErreurArgent` (vérifié à la main), mais rien ne le fige. Ajouter ces cas, par exemple dans `resultat-negatif-is-nul`.

## Remarques (non bloquantes)
- `point-mort.ts:44` : la mutation de l'arrondi `superieur` -> `inferieur` passe, car le banc ne produit que des divisions exactes. Un cas avec reste serait utile.
- `point-mort.ts:28` : le filtre `statut === 'valide'` double celui de `balance()`. Il sert seulement à rendre `vide` un exercice qui n'a que des brouillons, et aucun test ne couvre ce cas.
- La PR amende sa propre fiche (signature `contexte`, 9e test, critère de garde, proratisation du plafond, qui va au-delà du texte de la fiche). C'est permis par `fichiers_autorises` et rien n'est affaibli. Fiche sensible : fusion par Will seul.
