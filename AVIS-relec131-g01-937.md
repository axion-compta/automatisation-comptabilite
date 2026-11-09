VERDICT: OK
SHA relu : ab7f74b06b492db6f8ca55d8f720f67ef926bcd7
PR : 937 — fiche L08-T34 — branche lot-08/L08-T34 — sensible : non

## Contrôles
- Fichiers modifiés : 7, tous dans `fichiers_autorises` ; `navigateur.ts` et `noeud.ts` inchangés.
- Taille : 140 lignes (max fiche 220, max dépôt 400) ; aucune ligne « - - ».
- Journal `pilotage/journal/L08-T34.md` : 6 lignes, commence par `# Journal L08-T34`.
- Tests : `packages/faux-serveur` 10 fichiers, 366 verts (2 todo existants) ; les 5 tests nommés présents ; `cinq-routes-interceptees` n'exige pas 501 (comme demandé).
- Chemins et méthodes identiques au contrat (`/sante` GET ; `/personnes/demandes` GET/POST ; `/personnes/demandes/{id}/traitement` POST ; `/personnes/recherche` GET).
- Noms du contrat entre fiches respectés : `handlersSante`, `handlersPersonnes`, `OptionsExploitationFaux` (forme exacte de la fiche) ; `REGLAGES_FICTIFS_PERSONNES` déclaré dans `handlers.ts` avec le commentaire « jamais une valeur légale » ; règles de conservation vides.
- Règle 13 : interface + faux service (handlers 501), rien en production, aucun secret ni adresse de serveur réel.
- `tsc --noEmit` (faux-serveur) vert ; `node scripts/verifier.mjs --gardes` : tout est vert (21 étapes).
- Mutations : branchement de `handlersSante` retiré (3 tests rouges) ; base ignorée (rouge) ; route de recherche retirée (3 rouges). Annulées.

## Remarques (non bloquantes)
- `exploitation-branchement.test.ts:37` : base `http://localhost:3000` en dur dans le test ; même forme que `abonnement-branchement.test.ts` déjà sur main, base fictive du faux serveur, pas une adresse de serveur réel. Préférer `http://exemple.fr` ou une autre base en `exemple` à l'avenir.
- `recherche-declaree-avant-le-motif-id` : le test resterait vert avec un motif générique `/personnes/demandes/:id/:action` en POST (mutation survivante) ; il vérifie surtout que la recherche est servie. Risque faible tant que les handlers sont des 501.
- Nom de test `options-par-defaut-sans-erreur` imposé par la fiche ; garde textes verte.
