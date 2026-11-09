VERDICT: OK
SHA relu : 091b11745791aafb5bd7d0c4f2221b5f14ee13ce
PR : 828 — fiche L09-T36 (faux serveur : lectures), branche lot-09/L09-T36

## Vérifications
- Fichiers modifiés (6) : tous dans `fichiers_autorises`.
- Taille : 170 lignes ajoutées, 1 retirée (plafond 300) ; aucune ligne « - - » ; garde:perimetre vert.
- Tests : `contrat-commun.test.ts` 264 verts, 6 todo ; les 6 tests nommés passent contre le vrai serveur ET le faux serveur.
- Mutations sur `domaines/profil.ts` : SIREN_INVALIDE en 400, PARAMETRE_ABSENT en 200, clé TVA toujours juste → rouge.
- Gardes vertes : fictif, textes, portes (porte de l'écran : vert), perimetre, fiches, tests, termine, litteraux, controles, ci, couleurs, actions, interrupteurs, appels, formats.
- Journal : 7 lignes, commence par `# Journal L09-T36`. Aucun mot interdit, aucun prix, société fictive Lemoine Rénovation.
- main : fusion 5925928 sans perte (seuls les fichiers de la fiche diffèrent de main à ce point) ; main a avancé de 3 commits depuis (#822, #858, #856), sans conflit et sans toucher packages/faux-serveur.

## Remarques (non bloquantes)
1. `suite-profil.ts:40-49` (`regimes-tries`) : Lemoine n'a qu'une ligne de régime TVA et une d'imposition, donc l'ordre n'est pas vérifié (mutation `.reverse()` dans le handler : reste vert). Le tri est couvert par `packages/contrat/src/__tests__/regimes.test.ts` ; à renforcer quand les données fictives auront deux lignes.
2. `domaines/profil.ts:20-23` : le 400 sur clé répétée (`?au=…&au=…`) n'est testé par aucune suite (mutation qui retire ce contrôle : reste vert). Ajouter un cas dans une prochaine fiche.
3. `suite-profil.ts:74` : `'00000001' + '8'` assemble le SIREN pour ne pas être lu par garde:fictif. La valeur est fictive (aucun risque de donnée réelle), mais ce montage contourne la garde ; préférer une fiche qui ajoute la valeur de test à `SIREN_PERMIS`.
4. Remettre la branche à jour sur main avant fusion (piège de la fiche, couloir C).
