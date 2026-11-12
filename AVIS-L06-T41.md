VERDICT: OK

PR #1088, fiche L06-T41 (sensible : fusion par Will seul), SHA de tête relu : 492a3a54b3165fb6459d729a853fd85f6ea09896 (deuxième relecture, après l'avis A CORRIGER au SHA ee66a385).

## Défauts de l'avis précédent : corrigés
1. Signature de la veille non testée : tests `signature-d-une-autre-cle-refusee (T-JRN-5)` (tête cohérente signée par une autre paire ; chaîne tronquée avec tête réécrite et mauvaise clé) et `tete-d-une-autre-societe-refusee`. Mutations rouges : `verifierTeteSignee(...)` remplacé par `true` ; contrôle `societeId` retiré ; tête invalide ignorée (3 tests rouges).
2. T-JRN-1 : test sur 1 000 entrées construites par `ajouterLot`, faux coffre et faux dépôt ; modification, suppression et insertion passent par `controlerAvantExport` : refus `chaine_rompue`, `audit.chaine_rompue` signalé, aucun fichier déposé.
3. Veille absente : `teteVeille` (tete-journal.ts:40-53) remonte jour par jour jusqu'au jour de création et compare à la dernière tête signée trouvée. Test J signé, J+1 absent, chaîne tronquée, contrôle à J+2 : refus `fin_tronquee`. Mutations rouges : arrêt à la veille ; jour de création exclu de la remontée.

## Vérifications
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 248 lignes ajoutées, 1 retirée (limite 250). Garde périmètre verte.
- Tests ciblés : 11 verts. CI au SHA de tête : 9 jobs verts.
- Aucune clé réelle (paires Ed25519 créées par le test), aucune clé privée dans le module, aucune nouvelle dépendance, données fictives (marie@exemple.fr), aucun mot interdit. Journal : 8 lignes, commence par « # Journal L06-T41 ».

## Remarques (non bloquantes)
- tete-journal.ts:48 : un fichier de veille illisible (JSON invalide) renvoie `'invalide'`, ce qui est juste, mais aucun test ne le couvre. La mutation `return null` reste verte. Ajouter un cas « fichier de veille corrompu → refus `tete_divergente` » dans une fiche de suite.
- tete-journal.ts:41 : sans aucun fichier déposé (société ancienne, avant la mise en service), la remontée lit un fichier par jour depuis `creeLe`. Cela n'arrive qu'une fois par société, mais une borne (ou une date de mise en service en réglage) éviterait des milliers de lectures.
- Les remarques de l'avis précédent restent ouvertes et sont citées dans le commentaire de correction : dépôt unique par jour, toute erreur de `signerEtDeposer` rendue `coffre_indisponible`, relecture de nuit à 3 h UTC en dur (tete-journal.ts:106), alors que la fiche demande un « intervalle en réglage ». À trancher par Will ou par une fiche de suite.
