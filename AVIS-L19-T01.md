VERDICT: A CORRIGER

PR #1134 « MVP conception : fiches L19-T01 à L19-T35 », relue au SHA de tête 234d9f245a4547839abf8b809674584d7c30c1f4 (branche pilotage/fiches-MVP-19, à jour de main). Relecture Opus du 12/11/2026, consigne LOT5 section R.

Le lot est bon dans l'ensemble. Seules 2 fiches sont à retirer, et 1 dépendance est à reporter. Les 33 autres fiches peuvent rester telles quelles.

## Contrôles passés
- Forme identique à pilotage/fiches/L04-T56.md : mêmes clés, dans le même ordre, et 4 sections (Contexte, À faire, Hors périmètre, Pièges), pour les 35 fiches.
- taille_max_lignes compris entre 150 et 300 pour chaque fiche. statut a_faire. Aucune ligne bloque_par.
- depend_de : toutes les dépendances existent, aucune n'est bloquée. garde:fiches donne « 1098 fiches cohérentes » (44 avertissements, tous des recoupements de openapi.json entre lots, avec une dépendance déclarée).
- garde:textes et garde:fictif sont vertes. Aucun mot interdit. Aucun prix : « euros » n'apparaît que dans les noms de tests de L19-T21 et L19-T25.
- Aucun texte privé recopié : pas de décision, d'adresse, de nom ni de chiffre commercial.
- Aucune exigence n'est déjà portée par une fiche de main.
- Les CI de la tête sont toutes vertes : verifier, gardes, tests, e2e, types, lint, licences, gitleaks, stryker.
- Recoupements avec main : ils ne touchent que des fiches V1 bloquées (L16-T01, T02, T04, T05, T10, T14, T17, T55, L17-T25, T26). Le corps de la PR le signale. C'est acceptable.
- Aucune autre PR de code ouverte (#1105, #1128, #1129, #1131) ne touche ces chemins.

## Défauts (fiches à retirer de la PR)
1. pilotage/fiches/L19-T15.md : doublon de L26-T19 (PR ouverte #1138). Les deux fiches créent la même zone de dépôt globale active sur toute la coque, dans le même fichier apps/web/src/socle/Coque.tsx. L26-T19 couvre en plus le lot de 50 pièces et sa reprise.
   Correction demandée : retirer L19-T15. Le reste de V3-UX-042 (liste des glissers avec leur commande) pourra revenir dans une fiche qui dépend de L26-T19, une fois celle-ci fusionnée.
2. pilotage/fiches/L19-T16.md:11 : la fiche dépend de L19-T15. Si L19-T15 est retirée, remplacer « L19-T15 » par « L19-T14 », pour garder la chaîne sur Coque.tsx.
3. pilotage/fiches/L19-T29.md : doublon de L25-T15 et L25-T17 (PR ouverte #1136). Le même geste « Tout valider (N sûrs) » y est prévu : liste visible avant le geste, annulation du lot pendant 10 s, avec un composant apps/web/src/ecrans/e01/ToutValider.tsx. Deux composants feraient la même chose.
   Correction demandée : retirer L19-T29. Si Will préfère le composant commun, il faut à la place que L25-T17 l'utilise. Il ne faut pas garder les deux en parallèle.

## Remarques (non bloquantes)
- Recoupements avec d'autres PR de conception ouvertes, sans doublon. Ce sont seulement des fichiers pivots partagés :
  - packages/contrat/openapi.json : L19-T04, T07 et T28 avec L23-T02, L23-T20 (#1137), L24-T07 (#1135), L26-T15, T24 et T25 (#1138).
  - Registre du lot 15 du faux serveur : L19-T05 avec L26-T32.
  - apps/web/src/ecrans/e01/Ecran.tsx : L19-T06 et T26 avec L25-T17 (#1136) et L26-T33 à T35.
  - apps/web/src/ecrans/e07/Ecran.tsx et e07.ts : L19-T11 avec L20-T09, T10, T13 (#1133) et L23-T21.
  - apps/web/src/ecrans/e08/Ecran.tsx et e08.ts : L19-T10 avec L20-T15 et L22-T18 (#1139).
  - Coque.tsx : L19-T13 à T16 avec L26-T19 et L26-T27.
  - apps/web/src/main.tsx : L19-T23 et T34 avec L26-T01.
  Règle à appliquer : la PR fusionnée en second ajoute les depend_de vers les fiches déjà fusionnées qui partagent ses fichiers. garde:fiches ne les accepte qu'à ce moment-là.
- L19-T08 : le critère « la suite commune des zones passe sur le vrai serveur ET sur le faux » ne nomme ni le fichier ni le nombre de tests. Mieux vaut écrire « les N tests de packages/faux-serveur/src/__tests__/commun-pieces-zones.test.ts passent ».
- L19-T35 touche .github/workflows/ci.yml. La fiche porte bien sensible: oui, donc fusion par Will seul.
- La PR fait 1089 lignes, ce qu'impose une PR de conception unique. C'est noté.
