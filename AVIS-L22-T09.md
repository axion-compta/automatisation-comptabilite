VERDICT: OK

PR n°1151, fiche L22-T09 (sensible : fusion par Will seul). Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R), au SHA de tête e073ce2806f8ab4427417ccca97b02f672f77a74.
Avis précédent : A CORRIGER au SHA 37359a5b696913d56990c5b1c346d0bda8754a88.

## Défauts précédents : levés
1. Un TTC invalide supérieur au HT est maintenant testé (`12000.5`, `NaN`, `Infinity`, attente `montant_invalide`). La mutation qui retire `!entierPositif(ttc) ||` est TUÉE.
2. NaN, Infinity et 0.5 sont maintenant testés sur `htCentimes`, `ttcCentimes`, `effet.deductible` et `effet.perdue`. Les quatre mutations qui retirent chacune un contrôle `entierPositif(...)` sont TUÉES.

## Aucune régression
- Le diff contre main ne contient que les 6 fichiers de la fiche, pour 199 + 1 lignes, sous la limite de 200. Le correctif ne touche que le fichier de test, et le code est inchangé.
- Tests ciblés : noyau 5 sur 5 et textes 2 sur 2, verts en local.
- Journal : 7 lignes, il commence par `# Journal L22-T09`. Aucun mot interdit, aucun secret, aucun prix.
- La remarque sur le sixième test nommé, placé dans `textes`, reste acceptée.

## CI de la tête (hors périmètre de la PR)
- Les jobs `tests` et `verifier` sont rouges, et tous les autres jobs sont verts.
- Cause : un seul test échoue, `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`). L'en-tête attendu contient `porte` et l'en-tête lu `porte_rgpd`.
- Ce test échoue aussi sur `origin/main` (347401abb6fcba29b100aa6ba04d8ded5387684a), vérifié en local. Il vient du croisement des PR fusionnées n°1215 (L22-T30) et n°1146 (L25-T01).
- Ce n'est pas un défaut de l'auteur. Il faut une CI verte, après la réparation de main et une mise à niveau, avant la fusion.

SHA de tête relu : e073ce2806f8ab4427417ccca97b02f672f77a74
