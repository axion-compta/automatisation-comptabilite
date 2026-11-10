VERDICT: OK
SHA relu: 0fc739297f1835f062b1ca86a4b8693c8ab7e6e5

PR 979, fiche L00-T71 (branche pilotage/L00-T71-fiche), relecture Opus locale. Modèle : L00-T67 (PR 963), exécutée par PR 969.

Vérifié :
- Contenu de la PR : un seul fichier, pilotage/fiches/L00-T71.md (ajout, 33 lignes). Base à jour avec main.
- Les 15 champs sont présents (id, titre, phase, lot, couloir, ordre, statut, sensible, exigences, depend_de, fichiers_autorises, nouvelles_dependances, taille_max_lignes, tests_requis, criteres) ; sensible: oui ; taille_max_lignes: 60.
- fichiers_autorises = pilotage/fiches/L07-T19.md, pilotage/fiches/L15-T58.md, pilotage/fiches/L00-T71.md, pilotage/journal/L00-T71.md. Exact.
- Ajouts demandés : apps/serveur/src/__tests__/abonnement-branchement.test.ts pour L07-T19 ; apps/web/src/donnees/preferences.tsx et apps/web/src/donnees/__tests__/preferences.test.tsx pour L15-T58. Ces chemins sont bien ceux que modifient lot-07/L07-T19 et lot-15/L15-T58 hors liste sur main, et ceux que leurs fiches amendées en branche ajoutent. Aucun autre fichier n'est hors liste dans ces deux branches.
- L'amendement n'élargit rien d'autre : « rien d'autre » dans chaque étape, et le piège interdit de toucher statut, dépendances, critères. Même structure que L00-T67.
- depend_de: [] : pas de cycle. Aucun prix, aucun mot interdit. node outils/gardes/fiches.mjs au SHA relu : 902 fiches cohérentes (avertissements préexistants seulement).
- Critères exécutables : trois git grep sur les fiches, node scripts/verifier.mjs --gardes (l'option existe), contrôle du périmètre.

Remarque, non bloquante :
- Pour éviter un conflit avec les PR 974 et 975 (qui modifient déjà la même ligne fichiers_autorises), l'exécutant a intérêt à écrire la ligne exactement comme dans ces branches : dans L07-T19, le test inséré juste avant "pilotage/fiches/L07-T19.md" ; dans L15-T58, les deux fichiers insérés juste après "apps/web/src/socle/Coque.tsx". Ainsi, la fusion de main dans 974 et 975 n'aura pas de conflit sur cette ligne.
