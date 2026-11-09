VERDICT: A CORRIGER
SHA relu : 44817fa93a3e62fdec881d7edb4d8fa0c3551102

Relecture stricte de la PR 886, fiche SENSIBLE L11-T43 (corrige le code de L11-T26 après l'avis relec75-g01-882). Branche `lot-11/L11-T43`, base `origin/main` 6b9a187f15443473a446986f9b08b2d8d21c72d9.

## Ce qui est vérifié et tient
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` (service, test serveur, fiche, journal) ; ni `app.ts`, ni `openapi.json`, ni L11-T27. Taille : 167 lignes (+142 / -25), plafond 340 ; aucune ligne « - - », aucun octet NUL.
- Point 1 (création, dépense) : `propose` ramené à `a_completer` si `manquants(f)` n'est pas vide (`frais-actions-service.ts:59`).
- Point 2 : les lignes déjà rattachées à un autre frais non `refuse` sont retirées avant `determinerPayeur` (`:50`, `:54`) ; `ligneBanqueId` reste écrit dans le jeu.
- Point 3, mot pour mot (`:130-133`) : le statut du noyau est celui obtenu APRÈS le point 1 (`payeur()` l'applique) ; égal au courant → payeur du noyau écrit, statut gardé ; différent et `peutPasser` vrai → transition ; différent et refusé → payeur et `ligneBanqueId` du noyau jamais écrits, passage à `a_completer` si permis, sinon rien ne change.
- Point 6 : liste `FIGES` supprimée, `fige` tirée de `TRANSITIONS.valide` (`:27`) ; payeur `personne` d'un trajet commenté (`:90`) et tracé au journal ; `RELEVE_ESSAI` à côté de `FENETRE_ESSAI`, option `releveImporte` ; barème lu dans `jeu.parametres` avec dates et statut ; `carteGrisePieceId` recopié par décomposition conditionnelle.
- Point 7 : `jeu.trajets.push` et `jeu.frais.push` après `verifierInvariants` (`:95-97`) ; test `aucune-ecriture-si-erreur`.
- Les 5 tests ROUGES rougissent bien sur le code de main (test de la branche posé sur le service de main : 5 échecs, aux bonnes assertions) et passent sur la branche.
- Les 4 mutations de la fiche rejouées puis annulées, chacune tuée : `refuserDoublon` retiré de `completer` → `completer-doublon-piece-409` rouge ; `vehiculePour` retiré de `completer` → `completer-vehicule-societe-409` rouge ; rejeu recalculé au lieu de la réponse mémorisée → `rejeu-sans-deuxieme-effet` (et `idempotence-meme-reponse`) rouge ; statut du barème ignoré → `trajet-bareme-2026-a-completer` rouge.
- Mutations de plus : écrire le payeur du noyau dans le repli `a_completer` → rouge ; supprimer le repli → rouge ; garder l'ancien payeur quand les statuts sont égaux → `completer-change-la-version` rouge ; retirer `s === 'valide'` de `fige` → rouge.
- `completer-change-la-version` vert. Tests complets : `apps/serveur` 97 fichiers / 727 tests verts ; `packages/contrat` 61 fichiers / 409 verts (25 todo). `tsc` (contrat, serveur) et eslint verts. `pnpm contrat:openapi` : aucun écart.
- Journal : 7 lignes (8 au plus), commence par `# Journal L11-T43`, rouges et mutations rejouées notés. Aucun mot interdit, aucun prix, données fictives seulement.

## Défaut à corriger
1. `packages/contrat/src/domaines/frais-actions-service.ts:123-134` : au complément d'un TRAJET, le statut n'est jamais recalculé (seule une dépense avec `declaration` l'est). Or la PR permet maintenant qu'un trajet soit `propose` (point 6c), et le point 1 exige « au complément, `propose` seulement si `manquants(f, { trajet, vehicule })` est vide ». Constaté (sonde jetable, supprimée) : trajet du 2025-06-11 créé `propose` avec `VEH-01` (carte grise), puis PATCH `vehiculeId: 'VEH-04'` (location, `admissibilite` à `a_verifier`) → reste `propose` ; PATCH `vehiculeId: 'VEH-02'` (sans carte grise, `manquants` non vide) → reste `propose`. Une indemnité kilométrique non vérifiable reste ainsi validable. Correction : quand `vehiculeId` change sur un trajet, recalculer avec le nouveau véhicule la même règle qu'à la création (`admissibilite` calculable, barème `valide` en vigueur, `manquants` vide) ; sinon passer à `a_completer` si `peutPasser` le permet. Ajouter un test qui rougit aujourd'hui (trajet `propose` puis PATCH `VEH-04` ou `VEH-02` → `a_completer`).

## Remarques (non bloquantes seules)
- Mutants survivants hors liste de la fiche (21 tests verts) : retirer `&& x.statut !== 'refuse'` (`:50`) ; retirer `manquants(b, { trajet: t, vehicule })` (`:92`) ; retirer `admissibilite(t, vehicule).etat === 'calculable'` (`:89`). La 3e assertion de `trajet-bareme-2026-a-completer` (`VEH-04`) ne distingue pas `a_verifier` de l'absence de carte grise : ajouter un trajet `VEH-04` avec carte grise (attendu `a_completer`), un trajet `VEH-01` sans carte grise (attendu `a_completer`), et une ligne rattachée à un frais `refuse` qui redevient utilisable.
- `:133` : le transtypage `'a_completer' as StatutFrais` est inutile.
- Rappel de la fiche : double paiement fermé pour le `PATCH` seulement ; suite en L11-T44 (a). Fusion par Will seul.
