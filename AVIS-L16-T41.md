VERDICT: A CORRIGER

PR #1125 (L16-T41), SHA de tête 4afe5dbc017ae29a4941fc6c55d00a7a57683976 (branche lot-16/L16-T41). Relecture du 12/11/2026.

Ce qui est bon
- Périmètre : 4 fichiers, tous dans fichiers_autorises ; 135 lignes ajoutées (taille_max 220). Dépendances L14-T21 et L12-T17 « fait » sur main. CI 9/9 verte sur ce SHA.
- Les 5 tests nommés passent (cas 100 000 HT / 20 000 de TVA). Numéro de TVA jugé par `analyserNumeroTva` (statut `cle_juste` seulement) ; `operationSansTva` reçu en argument, jamais deviné ; aucun texte libre, aucun envoi.
- Mutations rouges : retrait du contrôle du numéro, de `operationSansTva`, du sens achat, de `tva === 0` ; levée à `<= 1` au lieu de `=== 0`.
- Retrait de `bloque_par` : même levée que L16-T09 (#1112, fusionnée). Ajout de `motif: 'tva_a_tort'` à la fiche : cohérent avec L16-T95 (`brouillonRectification` traite le motif `tva_a_tort`).
- Journal : 7 lignes, commence par « # Journal L16-T41 ». Aucun mot interdit, aucun prix, données fictives (SIREN inventé, clé de Luhn valide).

Défauts
1. packages/noyau/src/tva/facture-rectifiee.ts:39 (`montantEntier`) : la branche `n < 0` n'est couverte par aucun test. Mutation qui la retire : 5 tests verts. Conséquence non vue : une pièce d'achat à TVA négative (avoir) produirait un blocage `aTort: true` avec une TVA bloquée négative.
   Correction demandée : dans `tva-a-tort-bloquee-20000`, `detecterTvaATort(piece({ tvaFranceCentimes: -20000 }), contexte)` doit lever ; dans `rectifiee-avec-tva-reste-bloquee`, `leverBlocage(blocage, { tvaFranceCentimes: -1 })` doit lever.
2. packages/noyau/src/tva/__tests__/facture-rectifiee.test.ts : cas limites Infinity et non entier absents pour `leverBlocage`. Mutations `!Number.isSafeInteger(n)` -> `!Number.isFinite(n)` puis -> `Number.isNaN(n)` (facture-rectifiee.ts:39) : 5 tests verts. Le 1.5 du test de détection n'est rejeté que par `centimes()`, pas par la garde ; dans `leverBlocage`, 1.5 ou Infinity rendent « reste bloquée » sans exception.
   Correction demandée : `leverBlocage(blocage, { tvaFranceCentimes: 1.5 })` et `{ tvaFranceCentimes: Infinity }` doivent lever, et `detecterTvaATort(piece({ tvaFranceCentimes: Infinity }), contexte)` aussi.

Remarques
- `leverBlocage` ne relie pas la facture reçue à la pièce bloquée (`pieceId`) : le rattachement relève de L16-T95 (`recue` quand une pièce rectifiée est rattachée). Sans effet sur le verdict.
- Fiche sensible : relecture Opus, fusion par Will seul.
