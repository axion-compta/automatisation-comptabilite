VERDICT: A CORRIGER

Relecture 2 de la PR 883, fiche SENSIBLE L11-T43 (branche `pilotage/L11-T43`).
SHA relu : 5a5047f9cb7f0a860556f8686dc521c95753ef10
Diff relu : `pilotage/fiches/L11-T43.md` seul (+57 lignes). Avis précédent : AVIS-relec76-g01-883.md (6 défauts). J'ai vérifié les constats sur le code de `origin/main` avec un fichier de test jetable, sans le suivre dans git et supprimé après usage.

## Les 6 défauts de relec76
1. Jeu sur mesure : corrigé. `LIB-002` (2025-04-08, -5200, `CAR-01`), `creerServiceFraisActions({ jeu })` ; l'adaptation de `completer-payeur-societe-garde` est permise et décrite.
2. `ligneBanqueId` : corrigé. Les tests le lisent dans `jeu.frais` ; l'affichage dans la réponse passe à L11-T44.
3. Payeur `propose` → `a_completer` : le principe est corrigé, mais sa rédaction pose deux défauts nouveaux (D1, D2 ci-dessous).
4. Fiche de suivi : corrigé. Elle est nommée L11-T44, avec `depend_de: ["L11-T43"]`, et la fiche dit que L11-T27 doit en dépendre.
5. Tests rouges et tests tueurs : corrigé et vérifié sur main.
   - Rouges, constats sur main : creer → `propose` (manque `justificatif`) ; completer → `a_completer` puis `propose` ; même ligne → `LIB-002` sur les deux frais ; `propose` + ligne société → `propose`, payeur `societe`, `LIB-002` ; trajet 2025 avec carte grise → `a_completer`. Les 5 tests sont donc bien rouges.
   - Tueurs : les 3 mutations de code (retrait de `refuserDoublon` dans `completer`, retrait de `vehiculePour` dans `completer`, `calcul()` au lieu de `vu.reponse` dans `unefois`) font chacune rougir uniquement le test visé. La 4e mutation (statut du barème) ne se rejoue qu'après la correction, ce qui est cohérent.
6. Règles : corrigé.
   - (a) Règle exacte, statut par statut. Figés (409) : `valide`, `rembourse`, `en_compte_courant`. Modifiables : `brouillon`, `a_completer`, `propose`, `exclu_paye_societe`, `refuse`, `perso`. C'est identique à `FIGES` (`frais-actions-service.ts:23`).
   - (b) `personne` est justifié ; (c) précisé ; (d) défaut fixé et tracé.

## Défauts à corriger dans la fiche
D1. Point 3 : appliqué à la lettre, il casse un test de L11-T26 que la fiche interdit de modifier. `peutPasser(s, s)` est toujours faux, car aucun statut ne passe vers lui-même (`statuts.ts:5-14`). Avec « si le noyau donne un statut que `peutPasser` refuse, ne JAMAIS écrire le payeur », un frais `a_completer` complété par `declaration: 'societe'` (noyau : `a_completer`) garde `a_confirmer`. Or `completer-change-la-version` (`frais-actions.test.ts:57-58`) attend `payeur: 'societe'`. Constat sur main : `a_completer`/`a_confirmer` → `a_completer`/`societe`, grâce à la garde `r.statut !== f.statut` (`frais-actions-service.ts:117`).
   Correction : écrire « si le statut du noyau DIFFÈRE du statut courant et que `peutPasser` le refuse… ; s'il est égal, on écrit le payeur du noyau et on garde le statut (comportement actuel) ».

D2. Le double paiement n'est fermé que pour `PATCH`, et la justification « il ne peut plus être validé » est inexacte. Après le point 3, le frais est `a_completer`, payeur `personne`, sans `ligneBanqueId`, et rien ne garde la trace du conflit. L11-T27 (`POST /frais/{id}/proposer`, `pilotage/fiches/L11-T27.md`) peut le repasser en `propose` puis le valider sans relire la banque. Sa fiche ne prévoit pas cette relecture, et « la validation lira `ligneBanqueId` » ne voit rien, puisque ce champ n'est justement pas écrit. De plus, `L11-T27.md` sur main a toujours `depend_de` sans L11-T44 ni L11-T43, et aucune fiche ne dit qui l'ajoute.
   Correction, dans « Hors périmètre / L11-T44 » :
   - (a) avant `propose` et `valide`, L11-T27 rejoue la correspondance bancaire sur les lignes non rattachées et refuse `FRAIS_PAYE_SOCIETE` si une ligne de carte société correspond (ou bien L11-T44 trace le conflit dans le frais) ;
   - (b) nommer la PR qui ajoute `L11-T44` (et donc L11-T43) à `depend_de` de L11-T27 : celle qui rédige L11-T44, avec `pilotage/fiches/L11-T27.md` dans ses fichiers.

## Point NON VÉRIFIÉ par l'auteur (trajet `propose`) : réalisable
- `VehiculeFrais` (`packages/donnees-fictives/src/frais.ts:5-13`) n'a pas `carteGrisePieceId`, mais `Vehicule` du noyau l'a en option (`types.ts`).
  - Côté test : `Object.assign(<VEH-01 du jeu>, { carteGrisePieceId: 'PIE-CG1' })` compile.
  - Côté service : lecture par `VehiculeFrais & { carteGrisePieceId?: string }`, et recopie par décomposition conditionnelle (`exactOptionalPropertyTypes` est actif).
- `admissibilite` rend alors `calculable` (`trajet.ts:71-75`) et `manquants(f, { trajet, vehicule })` est vide.
- `verifierInvariants` ne lit pas le véhicule. Pour `propose` avec payeur `personne`, aucune violation (inv2 ne vise que `a_confirmer` ; inv5 n'agit pas sans contexte).
- `lire` rend le statut depuis le jeu.
- Aucun fichier hors des 4 du périmètre n'est nécessaire, et `apps/serveur` n'a pas à changer : le test passe par le service.

## Remarques (non bloquantes)
- `completer-propose-ligne-societe-a-completer` : donner une `pieceId` au frais ajouté, sinon `a_completer` peut venir du point 1 et non du point 3.
- `completer-sans-piece-reste-a-completer` : nommer le frais, par exemple créé par `creer(depense())` dans la même instance.
- Point 6(c) : préciser « en vigueur » (`effet_debut` ≤ date < `effet_fin`) et ce qui se passe sans paramètre (`a_completer`).
- Taille 340 : réaliste (fiche 57, service +40 environ, tests +110 environ, journal 8).
- `fichiers_autorises` : les chemins existent (le journal sera créé), et le diff ne touche que la fiche.
- Aucun mot interdit, aucun prix, données fictives seulement.
- Constat sur main (déjà couvert par le point 3) : aujourd'hui, un frais `propose` complété avec une ligne société devient `propose` + payeur `societe` + `ligneBanqueId`. L'incohérence est réelle en mémoire tant que L11-T43 n'est pas fusionnée.
