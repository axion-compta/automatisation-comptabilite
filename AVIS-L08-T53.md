VERDICT: A CORRIGER
SHA: e2167600419f6397883eb49e3300add992e5181d
PR: #1091

Fiche L08-T53 (sensible : fusion par Will seul), deuxième relecture (relecteur Opus), au SHA de tête e2167600419f6397883eb49e3300add992e5181d. L'avis précédent (A CORRIGER au SHA 4d782f7cd451adb42c329f567b3fa70836d1e751) relevait 1 défaut. `pilotage/ARRET` absent sur origin/main.

## Défaut de l'avis précédent : vérifié par mutation
1. Corps de refus non vérifié : CORRIGÉ. Les 4 tests (`chaque-route-sans-identite-401`, `sans-permission-403-sur-chaque-route`, `acces-et-portabilite-exigent-reauth`, `sans-double-facteur-401`) vérifient le corps entier par `toEqual({ defined: false, code, status, message: code })`. Mutation `personnes-acces.ts:33` (`message: 'detail ' + JSON.stringify(verdict)`) : 4 tests rouges sur 9.

## Défaut restant (bloquant)
1. `apps/serveur/src/__tests__/personnes-acces.test.ts:92` : le test `rectification-sans-reauth` ne vérifie rien. Il envoie l'issue `'rectification_faite'`, qui n'existe pas (`ISSUES_PAR_DROIT.rectification` = `['rectifiee', 'renvoi_societe']`). Le serveur répond 400 sur l'entrée, et `not.toBe(401)` passe. Le correcteur l'a constaté (réponse 400).
   Preuve par mutation : `personnes-acces.ts:10`, `TYPES_AVEC_REAUTH` étendu à `'rectification'` (et même à tous les types) : les 9 tests restent verts. Une réauthentification exigée à tort pour une rectification ne serait donc pas vue, alors que la fiche dit « même vieille connexion → 200 ».
   Correction demandée (dans le fichier de test seulement, déjà autorisé) : utiliser l'issue `'rectifiee'` et attendre `toBe(200)`. Essai local : avec ce changement, les 9 tests passent sur le code actuel, et la mutation ci-dessus fait rougir `rectification-sans-reauth`.

## Vérifié et correct au SHA de tête
- Fusion de `origin/main` sans rebase ni force-push ; le code n'a pas changé depuis la première relecture.
- Périmètre : 7 fichiers, tous dans `fichiers_autorises` ; diff de 212 lignes pour une limite de 260 ; aucune ligne « - - ».
- `personnes-acces.test.ts` 9/9 verts ; `commun-personnes.test.ts` 20 verts ; `node outils/gardes/fiches.mjs` : 1063 fiches cohérentes ; `node scripts/verifier.mjs --gardes` : 22 étapes vertes ; `tsc --noEmit` de `apps/serveur` : rien.
- CI au SHA de tête : les 9 jobs sont verts.
- Données fictives, aucun délai en dur dans le code, aucun prix, aucun mot interdit. Journal de 9 lignes.

## Remarques (non bloquantes)
- « `maintenantMs` non entier » est joué avec NaN (horloge illisible). C'est acceptable.
- Fiche sensible : pas de mise en production sans J10.
