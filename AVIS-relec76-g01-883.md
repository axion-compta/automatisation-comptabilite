VERDICT: A CORRIGER

Relecture de la PR 883, fiche SENSIBLE L11-T43 (branche `pilotage/L11-T43`), correction du code de L11-T26 (PR 882).
SHA relu : d7c5b50e6883e24f69ad3cb6cf1c2bf9fb41ebbd
Diff relu : `pilotage/fiches/L11-T43.md` seul, +38 lignes. Avis source : AVIS-relec75-g01-882.md (6 défauts). Constats vérifiés sur le code de `origin/main`.

## Ce qui tient
- (a) Les 6 défauts de l'avis ont chacun un point (1 à 6). La remarque « écriture après contrôles » devient le point 7. Les autres remarques sont notées au journal.
- (c) Les décisions du service restent dans `frais-actions-service.ts`. Les tests peuvent appeler le service, que `apps/serveur/src/domaines/frais-actions.ts:3` importe déjà.
- (d) 280 lignes : la marge est faible (service de 127 lignes et 8 tests, dont des jeux sur mesure), mais c'est faisable.
- (e) Les 4 chemins existent (le journal sera créé). Le diff ne touche que la fiche.
- (f) `depend_de: ["L11-T26"]` est juste. Les `fichiers_autorises` de L11-T27, T38, T39 et T40 ne contiennent ni le service ni ce test : pas de conflit de fichiers.
- (g) Aucun mot interdit, aucun prix, aucune donnée réelle. Les exigences sont présentes, le journal est limité à 8 lignes.

## Défauts à corriger dans la fiche
1. Le point 2 casse un test existant que la fiche interdit de modifier. Le jeu fictif n'a qu'une ligne bancaire, `LIB-001`, déjà rattachée à `FRA-001` (`exclu_paye_societe`, non refusé ; `packages/donnees-fictives/src/frais.ts:95` et `:126`). Une fois cette ligne exclue :
   - le test existant `completer-payeur-societe-garde` (`frais-actions.test.ts:62`), qui attend `payeur: societe` pour une dépense du 2025-03-12 de 6400 centimes, devient rouge ;
   - le nouveau test `meme-ligne-banque-une-seule-fois`, qui attend « la première est `payeur: societe` », ne peut pas passer non plus avec le jeu par défaut.

   Correction : ces tests utilisent une instance du service avec un jeu sur mesure (une ligne libre). La fiche autorise expressément l'adaptation de `completer-payeur-societe-garde` et précise le jeu à utiliser.
2. Le point 2 demande aussi de « rendre `ligneBanqueId` dans la réponse ». C'est impossible dans ce périmètre : `FraisDetail` (`packages/contrat/src/domaines/frais.ts:34`) et `lire` (`frais-service.ts:67`) ne portent pas ce champ. Il faudrait modifier `frais.ts`, `frais-service.ts` et `openapi.json`. Le service écrit déjà `ligneBanqueId` dans le jeu (`frais-actions-service.ts:61`).

   Correction : le test lit `ligneBanqueId` dans le jeu passé en option. L'affichage dans la réponse passe à la fiche de suivi.
3. Le point 3 n'est pas sûr pour l'argent. Prenons un frais `propose` (payeur `personne`) pour lequel une ligne de la carte société correspond. Avec la fiche, la réponse est 200, et le payeur, la ligne et le statut restent `propose`. Le frais reste donc validable puis remboursable (L11-T27) alors que la banque montre que la société a déjà payé : la dépense serait payée deux fois. Rien ne garde la trace du conflit à l'exécution, puisque « tracer au journal » vise le journal de fiche.

   Correction possible dans le périmètre : passer le frais `propose` à `a_completer`, transition permise (`statuts.ts:7`), pour bloquer la validation. On garde le payeur, on ne rattache pas la ligne et on ajoute un test. À défaut, il faut un refus explicite, mais il exige le contrat (voir le défaut 4).
4. La fiche de suivi n'a pas d'identifiant (« Fiche de SUIVI à créer »). Le renvoi n'est donc pas fait vers une fiche nommée. Il faut la nommer (ID, `depend_de: ["L11-T43"]`) et indiquer si L11-T27 (valider) doit en dépendre, puisque le défaut 3 touche la validation.
5. Le critère « les 8 nouveaux tests rougissent avant la correction » ne peut pas être tenu. Quatre tests sont verts sur `main` :
   - `completer-doublon-piece-409` et `completer-vehicule-societe-409` : `completer` appelle déjà `refuserDoublon` et `vehiculePour` ;
   - `rejeu-sans-deuxieme-effet` : le rejeu et l'id suivant fonctionnent déjà ;
   - `trajet-bareme-a-verifier` : un trajet est toujours `a_completer` sur `main`, donc « pas `propose` » est déjà vrai.

   Correction : séparer les tests rouges avant correction (4) des tests qui tuent un mutant nommé (4). Pour chacun de ces derniers, nommer la mutation à rejouer.
6. Le point 6 est ambigu ou contradictoire.
   - (a) « modifiable par `peutPasser` » : aucune règle ne se déduit de la table. `valide` a des sorties, et `a_completer` → `a_completer` est faux. Il faut écrire la règle exacte et ce qu'elle rend pour `exclu_paye_societe`, `refuse` et `perso`, encore modifiables aujourd'hui. Sinon le test `frais-valide-non-modifiable-409` et le comportement actuel peuvent changer sans que personne le voie.
   - (b) « payeur du trajet tiré du noyau » : aucune fonction du noyau ne donne le payeur d'un trajet, et le test existant (`frais-actions.test.ts:34`) attend `payeur: 'personne'`. Il faut dire d'où vient la valeur ou garder `personne` en le justifiant.
   - (c) « barème `a_verifier` » confond deux notions : `admissibilite` rend `a_verifier` pour un véhicule en location ou du conjoint (`trajet.ts:68`), alors que le statut du barème est dans `jeu.parametres` (2026 `a_verifier`). Il faut préciser laquelle des deux et le statut attendu pour le test.
   - (d) `releveImporte` : le jeu n'a pas ce champ et `app.ts` ne peut pas passer d'option. La valeur par défaut restera donc écrite en dur. Il faut la fixer dans la fiche et la tracer.

## Remarques
- Point 1 : pour un trajet, `manquants` sans `contexte` rend `motif_trajet` et `depart_arrivee`. Il faut préciser que le trajet et le véhicule sont passés.
- La future fiche payeur/véhicules touchera le service : sa `depend_de` doit citer L11-T43 (règle écrite dans « Pièges », à reporter quand elle sera rédigée).
- Fusion par Will seul (sensible) ; relecture Opus du code avec rejeu des deux mutants du point 4.
