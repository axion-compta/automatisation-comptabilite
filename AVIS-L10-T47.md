VERDICT: OK

PR #1073 (L10-T47), relue au SHA de tête a9eaeae76e6fe94b91b8d89bbeca6d846c2015d0. Fiche lue sur origin/main.

## Vérifications
- Fichiers de la fiche : Indicateurs.tsx, Ecran.tsx (import et une balise seulement), indicateurs.test.tsx, e24-ventes.test.tsx, textes e24-ventes.ts, fiche, journal (8 lignes, commence par « # Journal L10-T47 »). Environ 211 lignes pour la fiche, sous la limite de 250.
- Fichiers de L10-T36 dans le diff : attendus (empilée sur #1063). #1063 est fusionnée en squash (c9b72ae4) ; `git diff origin/main <tête>` sur ces fichiers est vide : ils sont identiques à main.
- Tests : `vitest run apps/web/src/ecrans/e24-ventes packages/faux-serveur/src/__tests__/commun-ventes-indicateurs.test.ts` : 30 passés sur 30 (les 6 tests nommés et ceux de L10-T46). `verifier --gardes` vert en local, tsc propre, fusion avec main sans conflit.
- Mutations (annulées ensuite) : montant de « TVA en attente » affiché en régime à confirmer → `regime-a-confirmer-bandeau-et-aucun-montant` rougit ; paramètre `avecPropositions` retiré → `avec-propositions-provisoire` rougit ; lien « en retard » sans filtre → `indicateur-mene-a-la-liste` rougit ; phrase « aucune vente ce mois-ci » retirée → `societe-vide-...` rougit ; erreur remplacée par « 0,00 » → `erreur-sans-chiffre-partiel` (e24-ventes.test.tsx) rougit.
- Aucun mot interdit, aucun prix, aucune valeur légale en dur, données fictives.

## CI
`garde:perimetre` rouge (fichiers de L10-T36 et taille 363 > 250) : fichiers d'une PR amont fusionnée en squash, ce n'est pas un défaut de l'auteur. Remède : `git merge origin/main` sur la branche (rôle M) ; ces fichiers sortent alors du diff.

## Remarques (non bloquantes)
1. Les liens mènent à `/factures/ventes?mois=…&etat=…`, mais `Ecran.tsx` ne lit pas ces paramètres (filtres en `useState('')`) : la liste n'est pas filtrée à l'arrivée. La fiche interdit d'autres changements dans `Ecran.tsx` : défaut de fiche, fiche de suite à prévoir.
2. Mois par défaut : `new Date().toISOString().slice(0, 7)` donne le mois UTC (écart possible la dernière heure du mois) ; la fiche parle de « date de référence ».
3. Le cas « indicateurs en erreur, liste affichée » n'a pas de test à lui (le test existant fait échouer les deux lectures à la fois).
4. Le provisoire est forcé côté client (`d.provisoire || propositions`) : une mutation qui ne garde que `d.provisoire` reste verte, car le faux serveur du test renvoie déjà `provisoire: true`.
