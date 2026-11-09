VERDICT: OK
SHA relu : 8e9522810c9de7816749ee5657472d2b9e5fefe9

Relecture stricte de la PR 888, qui ajoute la fiche SENSIBLE L11-T44 (branche `pilotage/L11-T44-ajout`). Diff relu : `pilotage/fiches/L11-T44.md` seul, +48 / -0, aucune ligne « - - », aucun octet NUL. Le code de comparaison est celui de `origin/main` (e40b9fab), sur lequel L11-T43 est `fait`. Avis lus en amont : relec78-g01-883, relec80-g01-886 et relec82-g01-886.

## Exactitude des constats, vérifiée dans le code de main
- (1) Jeu partagé : `app.ts:116-117` appelle `routesFrais()` et `routesFraisActions()` sans argument, ce qui donne deux jeux distincts. `creerServiceFrais` calcule `tous` et la table `trajets` une seule fois, à sa création (`frais-service.ts:26,47`). Le constat est exact. `creerApp` appelle `creerRouteur` à chaque construction (`app.ts:144-147`), donc un `jeuFrais` local à `creerRouteur` répond à la consigne « jamais au niveau du module ». Les deux routes acceptent déjà un service en paramètre (`apps/serveur/src/domaines/frais.ts:6`, `frais-actions.ts:6`), donc aucun fichier hors liste n'est à toucher.
- (2) Le repli silencieux existe bien (`frais-actions-service.ts:127-130`). Pour un frais `perso` ou `refuse`, le noyau rend `propose`, et ni ce statut ni `a_completer` ne sont permis (`statuts.ts:11-13`). La réponse est alors 200, avec une version augmentée et sans autre changement.
- (3) Le mappage des erreurs du serveur est générique (`errors[e.code]`, `apps/serveur/src/domaines/frais-actions.ts:12`). Ajouter `TRANSITION_INTERDITE` au type `CodeActions` et au contrat suffit, sans toucher `apps/serveur/src/domaines/`.
- (4) `conflitBanque` : la règle 1 de `determinerPayeur` (`payeur.ts:41-43`) ne dépend ni de la déclaration ni de `releveImporte`. Rejouer la correspondance sur les lignes filtrées comme au point 2 de L11-T43 rend donc exactement la ligne qui ferait passer le frais en `exclu_paye_societe`. Pour un trajet (montant 0), aucune ligne de débit ne correspond, et la fonction rend `undefined` sans lever d'exception.
- `ligneBanqueId` : `FRA-001` porte `LIB-001` (`donnees-fictives/src/frais.ts:95`). Aucun test existant ne fait d'égalité stricte sur un `FraisDetail` entier : partout c'est `toMatchObject`, ou une égalité entre deux réponses du même service. Le champ optionnel ne casse donc rien.

## Double paiement
Avec cette fiche, il ne reste que deux chemins de `a_completer` ou `brouillon` vers `propose`, et un seul de `propose` vers `valide` :
- le `PATCH`, qui relit déjà la banque depuis L11-T43 ;
- `proposer` et `valider` de L11-T27, qui appelleront `conflitBanque` avant toute écriture, avec un refus 409 `FRAIS_PAYE_SOCIETE`.

La relecture se fait sur l'état courant, sans trace, donc rien ne peut être oublié entre deux appels. Une ligne importée après la proposition est elle aussi vue à `valider`. La voie est unique et bien écrite.

## Contrôles de forme
- `fichiers_autorises` : 9 entrées. Les 7 fichiers de code et de test existent sur main ; la fiche et le journal sont à créer. Ces 9 fichiers suffisent pour les points 1 à 7.
- Taille 320 : réaliste. Le code compte une cinquantaine de lignes, les 8 tests de 80 à 110, plus le journal et le statut de la fiche. `openapi.json` est compté à part, sous le plafond de 600 (L00-T63 `fait`).
- Tests nommés : 7 sur 8 rougissent sur main.
  - `jeu-partage-*` : 404 ou `kmDixiemes` absent, et la mutation nommée (`tous` figé) est bien tuée par le compte de `GET /frais`.
  - `lire-ligne-banque-id` : le champ est absent sur main.
  - `completer-perso-transition-interdite-409` : 200 et version +1 sur main.
  - `contrat-completer-transition-interdite-409` : le code d'erreur est absent sur main.
  - `conflit-banque-*` : la fonction n'existe pas sur main.
  - Le jeu sur mesure avec `LIB-002` existe déjà dans le test (`frais-actions.test.ts:171-176`).
- `depend_de: ["L11-T43"]` : exact, L11-T43 est `fait`. L'exception « partage » de L00-T64 est présente (`outils/gardes/fiches-exceptions.json:5`) et explique l'ordre L11-T43, puis L11-T44, puis L11-T27.
- Risque de conflit :
  - L11-T38 et L11-T39 partagent `frais.ts`, `frais-actions.ts`, `app.ts` et `openapi.json`. Elles passent après L11-T27, qui dépendra de L11-T44.
  - L11-T40 ne partage aucun fichier.
  - L14-T39 ne partage que `openapi.json` (fichier généré : remise à jour, puis régénération, comme le dit la section Pièges).
- Exigences `V3-MOT-061` et `V3-MOT-060` : identiques à celles de L11-T26.
- Aucun mot interdit, aucun prix, données fictives seulement.

## Remarques (non bloquantes)
1. Ordre d'exécution, à surveiller en priorité. Sur main, L11-T27 est exécutable dès aujourd'hui : toutes ses dépendances sont `fait`, et ni L11-T43 ni L11-T44 n'y figurent. Si un auteur la prend avant la PR de pilotage annoncée (ajout de L11-T44 à `depend_de` et de la phrase sur `conflitBanque`), `valider` sera écrit sans relecture bancaire. Fusionner cette PR suivante juste après celle-ci, avant tout lancement de L11-T27.
2. `jeu-propre-a-chaque-application` est déjà vert sur main, puisqu'il y a deux jeux distincts. Le point 7 (« chaque test vu rouge avant le code ») ne peut donc être tenu que par la mutation « jeu au niveau du module ». À préciser dans le journal, sans incidence sur l'argent.
3. `conflitBanque(jeu, id)` n'a pas de paramètre de fenêtre. Elle prendra donc `FENETRE_ESSAI`, alors que `completer` lit `options.fenetreJours`. Le résultat est identique dans l'application, qui utilise les valeurs par défaut. Mais si L11-T27 crée son service avec une autre fenêtre, les deux relectures divergeraient. Accepter un troisième argument optionnel `{ fenetreJours }` serait plus sûr, ou bien imposer que L11-T27 n'utilise que `FENETRE_ESSAI`.
4. Le contexte dit « répond 200 sans rien changer ». En réalité, la version augmente sur main. Le test « même version » en tient compte : il est donc bien rouge sur main.
5. Le complément d'un trajet dont le statut n'a pas de sortie (`perso`, `refuse`) reste silencieux quand `vehiculeId` change (`frais-actions-service.ts:132`). Ce n'est pas un risque de paiement (indemnité kilométrique, sans banque), mais c'est à garder pour la fiche ultérieure sur la modifiabilité.
6. Fiche sensible (argent, `pilotage/`) : fusion par Will seul.
