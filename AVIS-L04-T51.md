VERDICT: A CORRIGER

PR #1108 (amendement de la fiche L04-T51), SHA de tête relu : fab62f89455d31f11de2e53924dab8851e7b98cd

Vérifications faites :
- Diff : une seule ligne changée, `fichiers_autorises` de `pilotage/fiches/L04-T51.md` ; rien d'autre ne bouge.
- Les 9 fichiers ajoutés existent tous sur main.
- Cassés par le passage sous `PREFIXE_ROUTES_SOCIETE` (URL `/pieces…` sans préfixe ni session) : `apps/serveur/src/__tests__/pieces.test.ts` (l. 15-30), `pieces-branchement.test.ts` (l. 13-16), `depot.test.ts` (l. 21-35), `correction.test.ts` (l. 17-29), `packages/contrat/src/__tests__/depot.test.ts` (l. 95), `pieces-routes.test.ts` (l. 10-13), `correction.test.ts` (l. 66-72 : `params` sans `s`), `packages/faux-serveur/src/__tests__/suite-pieces.ts` (l. 22-73).
- CI verte sur ce SHA.

Défaut (liste incomplète, l'auteur restera bloqué) :
1. `pilotage/fiches/L04-T51.md:12` : trois tests de main appellent `creerApp()` sur les routes du lot 04 sans préfixe ni session ; ils casseront et ne sont pas dans la liste :
   - `packages/faux-serveur/src/__tests__/commun-pieces.test.ts` l. 17 (`app.inject({ method: 'GET', url: chemin })`, chemin `/pieces…` venu de la suite) ;
   - `packages/faux-serveur/src/__tests__/commun-depot.test.ts` l. 28, 33, 34 (`/pieces`, `/pieces/${id}/etat`, `/pieces/${id}/relancer`) ;
   - `packages/faux-serveur/src/__tests__/commun-correction.test.ts` l. 19 (`/pieces/${id}/champs/${nom}`).
   Correction demandée : ajouter ces trois fichiers à `fichiers_autorises`. La cible « faux » (msw) de ces tests garde ses routes sans préfixe : c'est la cible « vrai » qui devra préfixer et ouvrir une session ; modifier seulement `suite-pieces.ts` casserait la cible faux.

Remarques :
- `packages/contrat/src/__tests__/pieces.test.ts` ne teste que le service (aucun chemin de route) ; il ne casse que si le masquage par défaut du service change (point 2 de la fiche). Ajout admissible, mais à ne modifier que pour cette raison.
- `taille_max_lignes` reste à 300 alors que `BLOQUE-L04-T51.md` prévient qu'elle ne suffira sans doute pas avec une douzaine de tests à reprendre : décision à prendre par Will (hausse ou scission).
- `packages/contrat/src/domaines-sans-prefixe.ts` (cliquet) : retirer `pieces`, `depot`, `correction` est permis mais pas obligatoire ; non ajouté, sans effet bloquant.
- PR sensible (touche `pilotage/`) : fusion par Will seul.
