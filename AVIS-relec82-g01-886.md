VERDICT: OK
SHA relu : c7c1d7351814f5432e66ddc491b2490b6f8e4891

2e relecture stricte de la PR 886, fiche SENSIBLE L11-T43 (argent : qui a payé). Branche `lot-11/L11-T43`, comparée à `origin/main` ad6d6b51ceee6195d90d09a21749cb5b7a0cb54d. Avis précédent : relec80-g01-886 (A CORRIGER sur 44817fa93a3e62fdec881d7edb4d8fa0c3551102).

## Défaut de l'avis précédent : corrigé
- `frais-actions-service.ts:127-138` : au complément d'un trajet, un changement de `vehiculeId` recalcule le statut avec `statutTrajet` (même règle qu'à la création : `admissibilite` calculable, barème `valide` en vigueur, `manquants(f, { trajet, vehicule })` vide), puis passe le frais si `peutPasser` l'accepte.
- Rejoué par une sonde jetable (supprimée) : trajet 2025-06-11 `propose` avec VEH-01 (carte grise), puis PATCH `VEH-04` (location) → `a_completer`, version 2, trajet réécrit sur VEH-04 ; PATCH `VEH-02` (sans carte grise) → `a_completer` ; PATCH `VEH-01` → reste `propose`. Retour de VEH-04 vers VEH-01 → `propose`, version 3.
- Le test `trajet-complement-vehicule-recalcule-statut` rougit sur le service de l'ancien SHA 44817fa9 (1 échec sur 25, ce test seulement) et passe sur c7c1d735.

## Mutants de l'avis précédent, rejoués puis annulés
- Retrait de `&& x.statut !== 'refuse'` → `ligne-d-un-frais-refuse-redevient-utilisable` rouge.
- Retrait de `admissibilite(t, vehicule).etat === 'calculable'` → `trajet-location-avec-carte-grise-a-completer` rouge.
- Retrait de `manquants(f, { trajet: t, vehicule })` : survit, mais le mutant est équivalent, comme l'indique le journal. Pour un trajet, `sansPiece` et `perdu` sont faux, et `admissibilite` calculable exige déjà la carte grise, le motif, le départ et l'arrivée (même `trim`) ainsi que le bon véhicule. Les kilomètres viennent de `lireKmDixiemes` et sont donc strictement positifs. Aucun risque.
- Le transtypage inutile `'a_completer' as StatutFrais` a été retiré.

## Mutations de la fiche et autres, rejouées puis annulées (chacune rouge)
- `refuserDoublon` retiré de `completer` → `completer-doublon-piece-409`.
- `vehiculePour` remplacé dans `completer` par une lecture brute du véhicule → `completer-vehicule-societe-409`.
- Statut du barème ignoré → `trajet-bareme-2026-a-completer`.
- Recalcul du trajet au complément supprimé → `trajet-complement-vehicule-recalcule-statut`.
- Payeur du noyau écrit dans le repli `a_completer` → `completer-propose-ligne-societe-a-completer`.
- Ancien payeur gardé quand les statuts sont égaux → `completer-change-la-version` et `completer-sans-piece-reste-a-completer`.

## Point 3 (règle exacte) : tenu
Si le statut est égal, le payeur du noyau est écrit et le statut gardé. S'il est différent et que `peutPasser` l'accepte, la transition a lieu. S'il est différent et refusé, ni le payeur ni `ligneBanqueId` du noyau ne sont écrits, et le frais passe à `a_completer` si c'est permis, sinon rien ne change. `completer-change-la-version` reste vert.

## Contrôles
- `apps/serveur` : 97 fichiers, 731 tests verts. `packages/contrat` : 61 fichiers, 409 verts (25 todo). `frais-actions.test.ts` : 25 verts.
- `tsc --noEmit` (contrat, serveur) et eslint sur les deux fichiers de code : verts. `contrat:openapi` : aucun écart (arbre propre après génération).
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` (service, test serveur, fiche, journal). Ni `app.ts`, ni `openapi.json`, ni L11-T27. Taille : 203 lignes pour un plafond de 340, aucune ligne « - - », aucun octet NUL.
- Aucun mot interdit, aucun prix, données fictives seulement. Seules les deux adaptations permises touchent les tests de L11-T26.

## Remarques (non bloquantes)
- `pilotage/journal/L11-T43.md` fait 9 lignes, titre compris. C'est sous la limite de 10 du dépôt, mais le point 8 de la fiche dit « 8 lignes au plus » : si le titre compte, il y a une ligne de trop. À resserrer lors d'un prochain passage, sans incidence sur l'argent.
- Rappel de la fiche : le double paiement n'est fermé que pour le `PATCH`. Un frais repassé en `propose` puis validé par L11-T27 reste à traiter en L11-T44 (a). Fusion par Will seul.
