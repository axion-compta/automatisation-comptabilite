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
`git fetch origin && node scripts/pilotage/avancement.mjs`, puis traiter L03-T58 (contre interface et faux fournisseur) et L02-T68 ; ensuite `pnpm install --frozen-lockfile && pnpm verifier`. Pour le lot 05, ne reprendre aucune fiche à `bloque_par` (section « Lot 05 »). Lot 07 : plus de fiche libre sans décision de Will (section « Lot 07 »).

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

## Lot 07, abonnement et console
- Existe : noyau `packages/noyau/src/abonnement/` (états, transitions, garde, file et reprise, compteur, seuils, prévision, quota, paliers, fin de contrat, gel, documents) ; 9 routes du contrat avec serveur en mémoire et faux serveur ; garde d'état sur toutes les routes ; bandeau, E53, E50 section fin de contrat, porte d'acceptation.
- Cas T-ABO : les 16 sont des `it` de `packages/noyau/src/abonnement/__tests__/scenarios.test.ts`, nommés `T-ABO-1` à `T-ABO-16`.
- T-ABO-1 à 2 : pause, puis reprise. T-ABO-3 : 6 états × 2 exports. T-ABO-4 : 4 transitions. T-ABO-5 : version périmée. T-ABO-6 : 5 états non actifs.
- T-ABO-7 à 11 : seuils, modes continuer et attente, relectures et doublon, plafond technique d'IA. T-ABO-12 : palier supérieur avec accord.
- T-ABO-13 : refus d'empreinte invalide testé ; le manifeste vérifié à 100 % est un `it.todo`, en attente du lot 05. T-ABO-14 à 16 : accusé, gel, remise sans accusé.
- Reste bloqué : les fiches L07-T33 à L07-T40 n'existent pas dans `pilotage/fiches/` (seules T00 à T32 et T41 à T44 s'y trouvent) ; la cause de chacune n'est donc pas lisible dans le dépôt. Causes annoncées par L07-T32 pour l'ensemble, une ligne par fiche :
  - L07-T33 : cause non lue (fiche absente) ; l'une de : hébergement, fournisseurs d'IA, réponse de la console, identité.
  - L07-T34 : idem. L07-T35 : idem. L07-T36 : idem.
  - L07-T37 : idem. L07-T38 : idem. L07-T39 : idem. L07-T40 : idem.
- Fiches : 37 au total ; 36 `statut: fait` avant cette PR (T00 à T31 et T41 à T44), T32 devient faite avec elle. Relevé `avancement.mjs` avec cette fiche : « Lot 07 : 37/37 ».
- Mesures PR (API REST, sans IA, relevé du 11/11/2026) : 41 PR fusionnées pour ces 36 fiches ; médiane ouverture à fusion 30,2 min (17 PR de fiches sensibles), 54,3 min (24 PR de fiches non sensibles). `pilotage/calibrage.csv` : en-tête seul, non utilisé.
- Score Stryker du noyau après le lot : non mesuré (dernière mesure connue : 86,67 %, lot 05, main 01c4579).
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
- Échecs CI : 0 contrôle en échec sur 711 au dernier commit des 79 PR (check-runs) ; 7 runs de workflow en échec sur 56 runs de branches lot-02/*, 6 branches (`actions/runs`, 3000 derniers runs). Stryker du noyau : 86,67 % (`npx stryker run`, main 69605cb).
- Prochaines étapes : L02-T68, puis la fiche de suivi du rappel du banc de rapprochement ; Will relit les PR sensibles.
- Aucune date de livraison annoncée.

## Lot 03
- Fiches : 59 (T00 à T58) ; 58 `statut: fait` avec L03-T07, en-têtes lus sur main (3217534) ; reste L03-T58 (explication d'un montant, `a_faire`, sensible, débloquée par D43 et J3a).
- Écart à la fiche T07 : T52 à T57 sont faites, plus bloquées ; elles sont écrites contre des interfaces et un faux serveur (D29 au 21/11/2026, D42, D43, J3a, aucune mise en production avant J10).
- FEC : fichier complet en octets, lecture et contrôles, banc de 11 jeux, rapport, import ; catalogue de règles (19, source `a_sourcer`).
- TVA : régime, périodes, périodicité, exigibilité, traitement, totaux ; formulaire, report, pas-à-pas, contrôles de déclaration ; échéances.
- États financiers, affectation, contrôles de clôture ; conservation ; paquet pour le comptable.
- Contrat, faux serveur et écrans E19 et E57 ; T52 à T57 : dépôts en mémoire, routes d'écriture, lien FEC court, envoi du paquet, purge planifiée, réception des factures (faux adaptateur).
- Mesures PR (API REST, sans IA) : 65 PR fusionnées pour 59 fiches ; médiane ouverture à fusion 16,0 min (49 sensibles), 31,9 min (16 non sensibles). `pilotage/calibrage.csv` : vide (en-tête seul).
- Stryker du noyau : 86,67 % (195 tués, 30 survivants, `npx stryker run` dans `packages/noyau`, main 3217534). Échecs CI du lot : non mesuré.
- Reste : L03-T58 ; fiches de suite à créer (adaptateurs réels de purge et de sauvegardes ; route du webhook des factures reçues et rattrapage planifié) après la console du 21/11/2026 et J10 ; aucun contact avec une plateforme agréée sans l'accord de Will.
- Le FEC n'est PAS déclaré accepté par l'outil officiel : le passage dans Test Compta Demat (J7) n'est pas fait.
- Aucune date de livraison annoncée.

## Lot 05, chat et agents
- Fiches : 69 (T00 à T68) ; 63 `statut: fait` avec L05-T55 (en-têtes lus sur main, 01c4579). Restent `a_faire` : T60, T62, T64, T66, T67. Écart à la fiche T55 : T56 à T59, T61, T63 et T65 sont faites, seules 5 fiches sont bloquées.
- Existe : noyau du chat (`packages/noyau/src/chat/`), agents (`agents/`), voix (`voix/`) ; contrat (`packages/contrat/src/chat/`) ; serveur en mémoire avec modèle simulé (`apps/serveur/src/chat/`) ; faux serveur ; composants et panneau de discussion (`apps/web/src/chat/`, coque T53) ; garde des outils du chat (`outils/gardes/outils-chat.mjs`).
- Rejoués par L05-T42 (`apps/serveur/src/chat/__tests__/`, un `it` par cas, port de test, zéro réseau) : 9 T-CHT (3, 4, 9, 10, 13, 14, 15, 16, 17) et 12 A2 (01, 02, 04, 06, 07, 08, 10, 16, 17, 18, 22, 30).
- Attendent une décision de Will (énoncé dans la spec privée) : T-CHT-1, 2, 5, 6, 19, 20 ; A2-03, 09, 20, 21, 27, 28.
- Attendent le branchement dans le serveur en mémoire (règle déjà testée dans le noyau) : T-CHT-7 et A2-25 (T12), T-CHT-8 (T11), A2-11 à 15 et A2-26 (T16), A2-19 (T23), A2-24 (T22), A2-29 (T02, T47).
- Rejoués ailleurs : T-CHT-12 (T40), T-CHT-11 (T50), T-CHT-18 (T31), A2-06 côté écran (T44, T52). Attendent une fiche bloquée : A2-05 voix (T60), A2-23 réseau (T59, adaptateur réel).
- Fiches bloquées :
  - T60 voix : hébergeur de transcription (D42) et Q3, décisions en attente.
  - T62 recherche plein texte : base réelle (J3a) et T56.
  - T64 banc des modèles réels : fournisseurs d'IA de l'UE (D43) et adaptateur réel de T59.
  - T66 effacement à l'échéance : action de la console (D29), durée de conservation (D45), T56.
  - T67 revue de sécurité du niveau I : Q11, T58, T59, T60 ; approbation écrite de Will.
  - T56 à T59, T61, T63, T65 : faites, plus bloquées.
- Mesures PR (API REST, sans IA, titres L05-T*) : 70 PR fusionnées pour 63 fiches ; médiane ouverture à fusion 24,2 min (33 PR de fiches sensibles), 25,3 min (37 PR de fiches non sensibles). `pilotage/calibrage.csv` : en-tête seul, non utilisé.
- Stryker du noyau : 86,67 % (195 tués, 30 survivants, `npx stryker run` dans `packages/noyau`, main 01c4579). Échecs CI du lot : non mesuré.
- Aucune date de livraison annoncée.

## Lot 06 (partie sans décision)
- Fiches planifiées T00 à T35 : 36, dont 35 `fait` (T03 incluse une fois cette PR fusionnée). Hypothèses recalées, aucune date annoncée.
- PR fusionnées (droits, isolation, connexion, débit, arrêt, dates) : T00 #220, T01 #221, T02 #584, T04 #864 et #873, T05 #890, T06 #920, T07 #340, T08 #341, T09 #342, T10 #343, T11 #344.
- PR (journal, signalements, IA, serveur) : T12 #500, T13 #501, T14 #581, T15 #612, T16 #345, T17 #346, T18 #347, T19 #348, T20 #502, T21 #349, T22 #222, T23 #350.
- PR (serveur, contrat, front, scénarios) : T24 #503, T25 #416, T26 #504, T27 #427, T28 #946, T29 #984, T30 #385, T31 #509, T32 #476, T33 #1000, T34 #223, T35 #938.
- Mesures PR (API REST, sans IA, relevé du 11/11/2026) : 36 PR pour 35 fiches ; médiane ouverture à fusion 26,2 min (28 PR de fiches sensibles), 14,8 min (8 PR de fiches non sensibles : T20, T22, T29 à T34).
- Durée de la CI sur main (3 exécutions vertes de ci.yml du 11/11/2026) : 232, 193 et 368 s.
- Stryker du noyau : 86,67 % à la dernière mesure (lot 02, main 01c4579) ; non remesuré ici (Node 22 dans cette session, le dépôt exige Node 24).
- Vérifié ici : `node outils/gardes/fiches.mjs` sort en code 0 (906 fiches cohérentes). Test du contrat de L06-T01 : non lancé ici, il tourne en CI.
- Cas de la spec rejoués par L06-T35 : C02, C04, C05, C06, C07, C09, C11, C12, C13, C14, C17, C19, C24, C25 ; T-ROL-1, T-ROL-2, T-ROL-3, T-ROL-5 ; T-CNX-2, T-CNX-3 ; T-ISO-3, T-ISO-5 ; T-JRN-1, T-JRN-3, T-JRN-6, T-JRN-7 ; T-SEC-3, T-SEC-7 ; T-SUP-2.
- Cas non rejoués (vrai serveur, identité et base requis) : C01, C03, C10, C15, C16, C18, C20 à C23 ; T-CNX-1, T-CNX-4 à T-CNX-7 ; T-ISO-1, 2, 4, 6 ; T-JRN-2, 4, 5 ; T-SEC-1, 2, 4 à 6, 8 ; T-SUP-1, 3.
- Bloqué, à `a_faire` : T36 à T42, T44 à T46 et T48 ; T47 dépend de T39. Décisions attendues : D29 (identité et schéma de la console), J3a, D42 (stockage et bases), D45 (T48 seulement). T43 est faite.
- Écart à la fiche : la décision D43 n'est citée par aucune fiche T36 à T48 restante.

## Lot 15, interface transverse (sortie)
Relevé du 11/11/2026 sur main à jour (en-têtes de fiches, API de recherche des PR).
- Fiches : 70 (T00 à T69) ; 65 `statut: fait` avant cette PR, 66 avec L15-T05. Restent `a_faire` : T62, T63, T67, T68.
- Bloquées ou en attente (motif lu dans chaque fiche sur main) :
  - T62 (résoudre une alerte en un clic) : fiche débloquée, non faite, aucune PR ouverte.
  - T63 (envoi du résumé) : PR #1047 ouverte ; point P2, aucun fournisseur d'e-mail choisi ; écrite contre une interface d'envoi et un faux.
  - T64 (index de recherche en base) : faite (PR #1043).
  - T67 (chat en 4 états) : `bloque_par` : `Coque.tsx` et `coque.test.tsx` sont dans les `fichiers_autorises` de L06-T45 (lot 06) ; ordre à fixer par Will.
  - T68 (banc des 111 cas) : à faire, dépend de T62 et T63 (T64 à T66 faites) ; les seuils de performance sont des HYPOTHÈSES.
- Les PR #1022 (T65), #1032 (L00-T83) et #1043 (T64) sont fusionnées ; motifs relus sur main (f77e2dd).
- Mesures sans IA (API de recherche, titres contenant « L15- », fusionnées) : 75 PR pour 64 fiches distinctes, du 07/11/2026 13:17 UTC au 11/11/2026 17:57 UTC.
- Délai médian ouverture à fusion : 39,6 min pour les 75 PR ; 65,3 min pour 29 PR de fiches sensibles ; 39,4 min pour 39 PR de fiches non sensibles ; 7 PR sans fiche reconnue (créations de fiches).
- `pilotage/calibrage.csv` : en-tête seul, non utilisé. Jetons par fiche, score Stryker, durée de CI : non mesurés ici.
- Écarts : l'isolation (T60) existe contre des interfaces et des faux ; aucune base réelle. Aucune date de livraison annoncée.

### Cas de la spec 15 (111) : état au 11/11/2026
Limite : le texte de la spec 15 n'est pas dans ce dépôt public (le journal de L15-T60 le dit aussi). Un `git grep` de `X13b` et `R06b` dans `apps` et `packages` ne trouve aucun test : seules trois fiches citent ces identifiants. Aucun cas n'est donc affirmé couvert ; aucune correspondance cas par test n'a été vérifiée.
| Famille | Cas | Nombre | Test qui couvre | Attente |
|---|---|---|---|---|
| T | T01 à T41 | 41 | non établi | banc nommé par identifiant : attend L15-T68 (à faire, dépend de T62 et T63) |
| P | P01 à P26 | 26 | non établi | attend L15-T68 (à faire, dépend de T62 et T63) |
| R | R01 à R17, R06b, R07b | 19 | non établi | attend L15-T68 (à faire, dépend de T62 et T63) |
| X | X01 à X23, X13b, X14b | 25 | non établi | attend L15-T68 (à faire, dépend de T62 et T63) |
- Total : 41 + 26 + 19 + 25 = 111.
- Cas de sécurité (S), cités par les critères de L15-T60 : R02, R03, R04, R06b, R07, R07b, R11, R12, R15, X04 à X06, X10, X11, X13, X13b, X14, X14b, X21, T31, P24. Tous restent « en attente » : T60 est faite contre des interfaces et des faux, pas contre l'isolation réelle ; le serveur en mémoire imite ces cas sans les prouver.
- Suite : L15-T68 donne un test par cas, nommé par son identifiant, et met ce tableau à jour.
