VERDICT: A CORRIGER

PR #1088, fiche L06-T41 (sensible : fusion par Will seul), SHA de tête relu : ee66a385b085a8bd28f539dd2e84912e21dc45c8

## Vérifications
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 230 lignes ajoutées, 1 retirée (limite 250).
- Aucune clé réelle (paire Ed25519 créée par le test), aucune clé privée dans le module, aucune nouvelle dépendance, données fictives (marie@exemple.fr), aucun mot interdit.
- Journal : 8 lignes, commence par « # Journal L06-T41 ». CI : 9 jobs verts. Tests ciblés : 7 verts.
- Mutations rouges : veille lue au lieu de la veille (jour même), `teteSignee` non transmise à `verifierChaine`, `audit.chaine_rompue` non signalé avant l'export.
- Mutations qui RESTENT VERTES : voir les défauts 1 et 2.

## Défauts
1. apps/serveur/src/securite/tete-journal.ts:51 : la vérification de la signature de la veille n'est pas testée. Remplacer `verifierTeteSignee(...) && f.tete.societeId === societeId` par `true` laisse les 7 tests verts. Le test `signature-alteree-bloque-l-export` change `sequence` ; c'est `verifierChaine` qui rejette (la tête ne correspond plus à la chaîne), pas la signature. T-JRN-5 (« la signature de la veille se vérifie avec la clé publique du coffre ») n'est donc pas prouvé. Le contrôle `societeId` survit aussi à sa suppression.
   Correction demandée, dans tete-journal.test.ts : (a) une tête de la veille cohérente avec la chaîne mais signée par une AUTRE paire éphémère (ou avec une signature altérée) → export refusé (`chaine_rompue`, défaut `tete_divergente`) ; (b) une chaîne tronquée à la fin, avec une tête de veille réécrite pour correspondre et signée par la mauvaise clé → refus ; (c) un fichier de veille d'une autre société → refus. Chaque test doit rougir quand on retire le contrôle correspondant.
2. Critère de la fiche « T-JRN-1 et T-JRN-5 verts sur la chaîne de L06-T15 avec un faux coffre et un faux stockage » : aucun test T-JRN-1 dans cette PR. Le journal (ligne 7) ne cite que T-JRN-5. T-JRN-1 (L06-T15) demande, sur une base de 1 000 entrées construite par `ajouterLot`, une ligne modifiée, une supprimée et une insérée : 3 détections sur 3. Ici seules la modification (export) et la suppression (tâche de nuit) passent par ce module ; l'insertion n'est jamais testée.
   Correction demandée : un test nommé `T-JRN-1`, avec une base de 1 000 entrées, le faux coffre et le faux dépôt de `monde()`, et les trois altérations passées par `controlerAvantExport`. Attendu : `autorise: false`, `audit.chaine_rompue` signalé, aucun fichier déposé.
3. tete-journal.ts:48 : si le fichier de la veille manque, aucune tête signée n'est comparée et la nouvelle tête est signée telle quelle. Cas concret : jour J signé ; J+1 sans signature (arrêt du serveur, ou fichier supprimé du stockage) ; à J+2, la chaîne peut avoir été réécrite et recalculée avant la tête de J sans être vue, et cette chaîne réécrite est signée. La fiche L06-T15 demande de comparer à la « dernière tête signée ».
   Correction demandée : en l'absence de la veille, remonter jour après jour (`lire`) jusqu'à `creeLe` et vérifier contre la dernière tête signée trouvée. Sinon, au minimum, signaler l'absence quand la société existe depuis avant la veille. Test : J signé, J+1 absent, chaîne altérée, contrôle à J+2 → refus.

## Remarques (non bloquantes)
- tete-journal.ts:77 : le dépôt est unique par jour, donc les signatures horaires et celles d'export qui suivent la première du jour sont calculées puis jetées (`existant`). Seule la première tête du jour reste hors base. Cela suit le chemin `{date}.json` de la spec, mais mérite une note au journal ou une décision.
- tete-journal.ts:90 : toute erreur de `signerEtDeposer` est rendue comme `coffre_indisponible`, y compris une panne du dépôt ou une rupture vue à la seconde relecture. Mieux : relire une seule fois et distinguer les causes.
- tete-journal.ts:114 : l'heure de la relecture de nuit (3 h UTC) est en dur, alors que la fiche demande un « intervalle en réglage ». La mettre dans `reglage` comme `minuteHoraire`.
