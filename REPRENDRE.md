# REPRENDRE : état à la sortie de la phase P0

Dépôt public, données fictives seulement : aucun secret, aucun prix. Lis ce bloc avant d'agir.

## Fait en P0
- Fiches L00-T00 à L00-T17 et L00-T19 à L00-T34 faites ; L00-T18 clôt la phase.
- CI en 8 tâches (types, lint, tests, gardes, e2e, gitleaks, licences, stryker) agrégées par la tâche `verifier`, seul contrôle obligatoire.
- Gardes dans `outils/gardes/` (fictif, couleurs, textes, actions, interrupteurs, appels, ci, perimetre, tests, termine, licences), lancées par `pnpm verifier`.
- Pilotage par fiches : `pilotage/LISEZMOI.md`, `pilotage/consignes/`, `pilotage/journal/`, avancement par `node scripts/pilotage/avancement.mjs`.

## Preuve : un faux secret est bloqué
- Méthode : dépôt Git jetable, hors de ce dépôt, contenant une fausse clé d'accès de forme AWS (assemblée à l'exécution, jamais écrite dans ce dépôt), validée avec la configuration `.gitleaks.toml` du dépôt.
- Résultat du 06/11/2026 : `gitleaks git --config .gitleaks.toml .` signale 1 fuite (règle `aws-access-token`) et sort en code 1 ; sur ce dépôt-ci, le même contrôle sort en code 0.
- En CI, la tâche `gitleaks` fait partie des `needs` de `verifier` : un résultat rouge bloque la PR. Le faux secret n'a jamais été poussé ni proposé à main.
- Limite : preuve locale avec le même outil et la même configuration, non rejouée en CI par une PR piégée (elle exposerait la fausse clé dans l'historique public).

## Mesure de la CI
- Durées de bout en bout des 6 dernières exécutions vertes sur main : 46, 47, 47, 64, 69 et 495 s (la valeur de 495 s est une exception, probablement une attente de machine).
- Par tâche (exécution de la PR L00-T24) : de 5 s à 42 s ; la plus longue est `e2e`. Critère « CI < 15 min » tenu, avec une marge d'environ 14 minutes.

## Lot 01, tranche 1
État lu sur main à jour le 07/11/2026 (`node scripts/pilotage/avancement.mjs` : « Lot 01 : 53/55 » ; 55 fiches au total, la tranche initiale de 39 a reçu des fiches de suivi).
- Noyau : écritures et états, numérotation continue, contre-passation, lettrage, balance et grand livre, plan, exercices et périodes.
- TVA et FEC en fonctions pures ; moteur de contrôles (règles pures, résultats tracés) et garde-fou de refus tant qu'un contrôle bloquant est ouvert.
- Contrat et faux serveur : exercices, plan comptable, clients et fournisseurs, suite commune.
- Web : coque (menu de bureau, barre du bas), composants de base et tableau accessible, routeur, trois écrans (N03, N04, E44), contrôle d'accessibilité en e2e.
- Remplacées : les fiches L01-T39 et L01-T47 restent « a_faire » dans leurs fichiers, mais leur travail est fait par L01-T54 (PR 115) et L01-T52 (PR 106). Le relevé ne les compte donc pas comme faites : 53/55, pas 54 ni 55.
- Reste : clore ou marquer ces deux fiches remplacées, puis fusionner cette fiche L01-T05.
Mesures sans IA, relevées le 07/11/2026 :
- 70 PR du lot 01 fusionnées (53 fiches distinctes, dont des PR de création de fiche), relevé `gh pr list --state merged`.
- Délai médian ouverture à fusion : 29,8 min pour 31 PR de fiches sensibles ; 15,3 min pour 37 PR de fiches non sensibles.
- `pilotage/calibrage.csv` : en-tête seul, aucune ligne ; temps d'attente de Will : non mesuré.
- 5 dernières CI vertes de main : 49, 63, 48, 64 et 49 s.

## Reste à faire
- Phases suivantes : voir `pilotage/fiches/` (pas de fiche libre en P0 une fois L00-T18 fusionnée).
- Will fusionne les PR sensibles ; le portier (L00-T21) fusionne les autres.
- Test `regle-eslint` de `packages/noyau` : peut dépasser 5 s en local, sans lien avec P0.

## Prochaine commande
`git fetch origin && node scripts/pilotage/avancement.mjs`, puis traiter les fiches L14-T39 à L14-T41 (contre interface et faux serveur) et le statut de L01-T39 et L01-T47 (remplacées) ; ensuite `pnpm install --frozen-lockfile && pnpm verifier`.

## Pièges
- Ne jamais écrire de faux secret en clair dans un fichier suivi : gitleaks le bloquerait.
- Ne jamais fusionner depuis une session auteur.
- Écrire les fichiers avec un outil d'édition, jamais d'octet NUL.

## Lot 13
- Fiches : 56 au total ; 48 marquées `statut: fait` avant L13-T46 (mesure : en-tête de chaque fiche) ; V1 L13-T38 à L13-T45 : faites.
- Restent `a_faire`, toutes sensibles : L13-T47, T48, T49, T51, T53, T54, T55. Toutes débloquées par la décision de Will du 07/11/2026 (J3a avec conditions), lue dans la section « Contexte » de chaque fiche : T47 : J3a + D14, D18, D29 ; T48 : J3a + D29 ; T49 : J3a + D29 ; T51 : J3a + D29, D43 ; T53 : J3a + D29, D42 ; T54 : J3a + D42 ; T55 : D62. Ce qui attend encore la console : le schéma `a_compta` et le module C4 (D29, réponse attendue le 21/11/2026).
- Durée réelle : premier commit de code de L13-T00 le 08/11/2026 à 04:57 (+01:00, #659) ; dernière fusion relevée le 08/11/2026 à 09:21 (#768), soit environ 4 h 24 min ; fiches du lot posées la veille à 14:13 (#120).
- Nombre de PR du lot, délai médian de fusion (sensible, non sensible) : non mesuré (pas de gh dans cette session).
- PR revenues en `a-corriger` et raisons : non mesuré.
- Score Stryker du noyau à la fin : non mesuré.
- Aucune date de livraison annoncée.

## Lot 12
- Fiches : 56 au total ; 53 marquées `statut: fait` (en-têtes lus sur main, L12-T30 comprise) ; restent L12-T48, T49 et T50, toutes sensibles.
- Catalogue : `docs/controles.csv`, 72 lignes de données (68 identifiants CC-* et 4 identifiants TVA-C*), relevé par comptage.
- Banc (L12-T28, référence `docs/calibrage-controles.json`) : 20 anomalies détectées sur 20, 0 fausse alerte sur 200 pièces propres ; seuil toléré : 10.
- L12-T48 (journal en ajout seul, colonnes de `regle_controle`) : attend J3a et le schéma de la console (D29, réponse attendue le 21/11/2026).
- L12-T49 (écarter un contrôle, revérifier) : attend J3a (identité, permission, réauthentification) et la console (D29).
- L12-T50 (garde-fou sur les actions réelles) : attend J3a et les routes L03-T53 et L03-T54 (D29). D42 et D43 ne sont plus attendues : T51 à T55 sont faites.
- Écart à la fiche : elle annonçait 8 fiches bloquées (T48 à T55) ; T51 à T55 sont déjà faites, il n'en reste que 3.
- Écarts à la spec gardés : identifiants suffixés (K11M, K12H, K13S, T03A, T12M, T18M) ; vocabulaire du CSV et du code (gravité B/M, `bloque`, `declencheurs`).
- PR du lot (lignes, durée de CI, corrections après relecture) : non mesuré (pas de gh dans cette session) ; `pilotage/calibrage.csv` ne contient que l'en-tête, rien n'y est ajouté.
- Aucune date de livraison annoncée.

## Lot 14
- Existe (parties pures, lecture, contrat et faux serveur) : gardes des formats et du registre légal ; veille (circuit, état, mode dégradé) ; Sirene (planification, partage, cache) ; santé des connecteurs.
- Juridique : dispense, convocation, confidentialité, rapport de la SCI, rémunération, intérêts et écriture de compte courant.
- Paramètres : paquet versionné, pays, utilisation exigée. TVA : carte de paiement et rappels, rattachement, « sous réserve ».
- Cas sûr et ses versions ; budget de gestes ; textes et composants ; contrat et faux serveur (état de la veille et des connecteurs : L14-T32, L14-T33).
- Fiches T00 à T33 attendues par L14-T08 : `statut: fait` (en-têtes lus sur main). T35 et T42 sont aussi faites.
- Faites depuis (statut: fait sur main au 09/11/2026) : T34, T36, T37, T38.
- Restent `a_faire`, à écrire contre une interface et un faux serveur (données fictives, rien en production avant J10) :
  - T39 : routes d'écriture du juridique ; identité et double facteur de la console (D29).
  - T40 : routes TVA (refus 403, « payé », « sous réserve ») ; identité et rôles de la console (D29).
  - T41 : archive datée des rapports avec empreinte ; stockage chez l'hébergeur (D42).
- Mesures sans IA : les relevés du 08/11/2026 sont périmés (fusions faites depuis). Nombre de PR fusionnées et délais médians : non mesuré (à refaire, fiches et créations de fiche séparées) ; `pilotage/calibrage.csv` : en-tête seul ; score Stryker du noyau sur main : non mesuré.
- Aucune date de livraison annoncée.

## Lot 02
- Fiches : 71 au total (T00 à T70) ; 69 `statut: fait` avec L02-T06, en-têtes lus sur main au 09/11/2026 ; les 23 dépendances de L02-T06 sont faites.
- Écart à la fiche : T62 à T67 et T69 sont faites, plus bloquées. Restent L02-T68 (écran d'import, `a_faire`, non sensible) et L02-T70 (connexion bancaire, ABANDONNÉE par Will, D63 : ne jamais planifier).
- Banc de rapprochement (L02-T33, 3 graines) : 0 faux lien en `RAPPROCHEE` ; rappel 49/120 = 40,8 %, sous la cible de 90 % : fiche de suivi à ouvrir, banc non ajusté au moteur.
- Banc de profils : aucun résultat chiffré dans le dépôt ; L02-T50 porte les vues d'exemple, et le jeu de 10 relevés fictifs avec profils est celui de L02-T61, lu par L02-T20.
- Mesures PR (API REST, journal L02-T06) : 79 PR fusionnées pour 70 fiches ; médiane ouverture à fusion 33,9 min (51 sensibles), 30,9 min (28 non sensibles).
- Échecs CI et score Stryker du noyau : non mesurés (voir le journal).
- Prochaines étapes : L02-T68, puis la fiche de suivi du rappel du banc de rapprochement ; Will relit les PR sensibles.
- Aucune date de livraison annoncée.
