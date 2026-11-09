VERDICT: A CORRIGER
SHA relu : 3b41900eef0d23248e071e52f3d6efaab396e718

# Avis de relecture L03-T56 (PR 852, fiche sensible : fusion par Will seul), relecture après correction

## Vérifications faites
- Ancien défaut bloquant (confirmation des sauvegardes liée à `PortObjets.lister`) : corrigé par `PortPurges.listerEffaceesBase` (`purge-conservation.ts:103`), fiche mise à jour en conséquence. Le faux `lister` ne rend plus un objet effacé de la base (`purge-conservation.test.ts:34`). Mutation « relire les purges via les objets listés » : `sauvegardes-confirmees-apres-rotation` et `sauvegardes-confirmees-sans-relister-objet-et-par-societe` rouges.
- Ancienne remarque (filtre société non couvert) : corrigée. Le faux `listerEffaceesBase` ne filtre pas par société ; mutation qui retire `x.societeId === societeId` : rouge.
- Critère r4 : appel à `purgePossible` retiré = r3, r4, trop-tot, fin-de-contrat rouges.
- Autres mutations : `>` remplacé par `>=` (rouge) ; garde `objet.societeId !== societeId` retirée (4 tests rouges).
- Tests : 11/11 verts (les 10 nommés + 1 ajouté) ; `apps/serveur/src/taches` 70/70 ; eslint vert sur les deux fichiers ; `verifier --gardes` vert (21 étapes). CI au SHA relu : verifier, types, lint, tests, gardes, gitleaks, stryker, e2e, licences verts.
- Fusion de main (7fe5371, base e6fffd9) : `git diff e6fffd9 HEAD` ne touche que les 4 fichiers de la fiche, rien de main n'est perdu. Main a avancé de 2 commits depuis (L11-T27, L06-T05), sans recoupement.
- Périmètre : 4 fichiers, tous autorisés. Taille 299 lignes (max 300). Aucune ligne binaire, aucun octet NUL.
- Journal : 8 lignes, commence par `# Journal L03-T56`.
- Aucun mot interdit, aucun prix, aucun secret ; données fictives (`societe-a`, `societe-b`, `source-inventee`, durée 7 ans et rotation 4 jours inventées, passées en argument).

## Défaut bloquant
1. `apps/serveur/src/taches/__tests__/purge-conservation.test.ts:104-108` (`relance-idempotente`) ne teste plus la règle de la fiche « objet déjà `effacee_base` ou `effacee_sauvegardes` ignoré, aucun second effacement ». Depuis que le faux `lister` cache les objets effacés, la mutation qui retire `if (existante !== null && EFFACEES.includes(existante.statut)) continue;` (`purge-conservation.ts:107`) reste verte (11/11), alors qu'elle était rouge à l'ancien avis. Risque réel : un adaptateur dont la liste est en retard sur l'effacement (réplica, effacement asynchrone) ferait un second `effacerBase` et réécrirait la purge en `effacee_base` avec une nouvelle `effaceBaseLe`, ce qui fait repasser un objet `effacee_sauvegardes` en arrière et repousse sa preuve.
   Correction demandée : dans `relance-idempotente` (ou un cas voisin), faire lister encore l'objet alors qu'une purge `effacee_base` puis une purge `effacee_sauvegardes` existe déjà (option `purges` du faux monde, ou un faux `lister` qui ne cache pas), et vérifier : aucun appel à `effacerBase`, purge inchangée (statut et `preuve.effaceBaseLe`). La mutation ci-dessus doit rougir.

## Remarques (non bloquantes)
- `purge-conservation.ts:103` : le filtre `x.statut === 'effacee_base'` n'est couvert par aucun test (le faux `listerEffaceesBase` filtre déjà le statut). Peu de risque, puisque le port le promet ; un faux qui rend aussi une purge `planifiee` le couvrirait.
- L'inscription `Planificateur` reste renvoyée à une fiche de suite (note ajoutée dans la fiche) : à créer.
