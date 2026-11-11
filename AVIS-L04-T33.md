VERDICT: A CORRIGER

PR #1058, fiche L04-T33, 2e relecture. SHA de tête relu : e00e93cdafb0bf26c57180b5a050cfdbe79b25ef

## Points de l'avis précédent (98b261d, SHA 9af6c3f)
1. Lecture des fichiers par le faux serveur : CORRIGÉ POUR LE CAS PRINCIPAL. `depot.ts:11-19` lit `fichiers[<n>]` triés par indice ; un seul fichier `fichiers` donne 400 sur les deux cibles, `fichiers[0]` donne 200 sur les deux. Mutations : retour à `getAll('fichiers')` → 8 tests rouges ; tri inversé → 2 tests rouges.
2. Même corps aux deux cibles : CORRIGÉ. `commun-depot.test.ts:17-22` construit un seul corps multipart (`corpsMultipart`, `corpsIndexes`) pour les deux cibles ; test commun `un-fichier-sous-le-nom-fichiers-sans-crochets-refuse-400` ajouté dans `suite-depot.ts:30`.

## Défaut restant (suite du défaut 1 : « répondre 400 là où le vrai répond 400 »)
Sonde au SHA relu, même corps multipart envoyé aux deux cibles (statut vrai / faux) :
- `fichiers[1]` seul : 400 / 200 ;
- `fichiers[0]` + `fichiers[2]` (indices creux) : 400 / 200 ;
- `fichiers[0]` deux fois : 400 / 200 ;
- `fichiers[01]` : 400 / 200 ;
- `fichiers[]` (sans indice) : 200 / 400 ;
- `fichiers[0]` + `fichiers` : 200 avec 2 reçues / 200 avec 1 reçue.
`fichiers[]` est une convention courante côté client : un écran (L04-T42) qui l'emploie passera sur le vrai serveur et échouera sur le faux ; les indices creux ou doublés passent sur le faux et échouent sur le vrai.
Correction demandée, dans `packages/faux-serveur/src/domaines/depot.ts` (fonction `fichiersIndexes`) : reproduire la notation à crochets du vrai serveur : indices décimaux sans zéro de tête, chacun une seule fois et contigus à partir de 0, sinon 400 ; `fichiers[]` ajouté à la suite dans l'ordre d'arrivée. Ajouter dans `suite-depot.ts` un test commun (joué sur les deux cibles avec `deposerNomme` ou un équivalent à plusieurs parties) qui couvre au moins `fichiers[1]` seul, `fichiers[0]`+`fichiers[2]` et `fichiers[]`, et attend le même statut sur les deux cibles. Fichiers dans `fichiers_autorises`.

## Contrôles faits
- Fichiers modifiés : 6, tous dans `fichiers_autorises`. Taille : 214 + 2 = 216 lignes (max 250), aucune ligne « - - ».
- Tests ciblés `commun-depot.test.ts` : 19 verts.
- CI au SHA relu : les 9 jobs verts (`gardes` compris : L04-T31 est `fait` sur main).
- Aucun mot interdit, aucun prix, aucun secret ; données fictives seulement. Journal : 7 lignes, commence par `# Journal L04-T33`.

## Remarques
- `pilotage/journal/L04-T33.md:6` : « la suite envoie fichiers[i] (hors périmètre) » est dépassé depuis la correction ; à mettre à jour.
