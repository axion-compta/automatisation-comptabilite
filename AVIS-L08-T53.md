VERDICT: OK
SHA: f440a3cfc15ad3aa996c8efeb955bff9b5c01735
PR: #1091

Fiche L08-T53 (sensible : fusion par Will seul), troisième relecture (relecteur Opus), au SHA de tête f440a3cfc15ad3aa996c8efeb955bff9b5c01735. L'avis précédent (A CORRIGER au SHA e2167600419f6397883eb49e3300add992e5181d) relevait 1 défaut. `pilotage/ARRET` absent sur origin/main.

## Défaut de l'avis précédent : vérifié par mutation
1. `rectification-sans-reauth` ne vérifiait rien : CORRIGÉ. `personnes-acces.test.ts:92` envoie maintenant l'issue `'rectifiee'` et attend `toBe(200)`. C'est le seul changement de la PR depuis e2167600 (1 ligne, après une fusion de `origin/main` sans rebase).
   Mutation `personnes-acces.ts:10` : `TYPES_AVEC_REAUTH` étendu à `'rectification'`. Résultat : `rectification-sans-reauth` rouge (1 sur 9). Avec `TYPES_AVEC_REAUTH` étendu à tous les types : même résultat.

## Non-régression du défaut corrigé avant
- Mutation `personnes-acces.ts:33` (`message: 'detail ' + JSON.stringify(verdict)`) : 4 tests rouges sur 9. Le corps de refus reste vérifié en entier.

## Vérifié et correct au SHA de tête
- Périmètre : 7 fichiers, tous dans `fichiers_autorises` ; diff de 212 lignes pour une limite de 260 ; aucune ligne « - - ».
- `personnes-acces.test.ts` 9/9 verts ; `commun-personnes.test.ts` vert (29 tests en tout) ; `node outils/gardes/fiches.mjs` : 1063 fiches cohérentes ; `node scripts/verifier.mjs --gardes` : 22 étapes vertes ; `tsc --noEmit` de `apps/serveur` : rien.
- CI au SHA de tête : les 9 jobs sont verts (verifier, licences, lint, stryker, types, e2e, gardes, tests, gitleaks).
- Données fictives, aucun délai en dur dans le code, aucun prix, aucun mot interdit. Journal de 9 lignes, qui commence par `# Journal L08-T53`.

## Remarques (non bloquantes)
- « `maintenantMs` non entier » est joué avec NaN (horloge illisible). C'est acceptable.
- Fiche sensible : fusion par Will seul ; pas de mise en production sans J10.
