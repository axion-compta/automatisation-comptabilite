VERDICT: OK
SHA relu: 3deaa5e6c4b3c09fd7bd5c439823db1c34fda4e8

# Avis PR 894 — fiche SENSIBLE L08-T33 (branche pilotage/L08-T33-fichier)

Diff : un seul fichier, `pilotage/fiches/L08-T33.md`, +3/-2 (`git diff --numstat` sans ligne « - - »).

## Vérifications
- Blocage réel confirmé sur main : `packages/contrat/src/__tests__/exploitation-routes.test.ts:21` attend `Object.keys(contrat.personnes)` égal aux 3 clés ; `:42` attend `toHaveLength(3)`. Ajouter `rechercherPersonne` les rougirait.
- `fichiers_autorises` : ajout de `packages/contrat/src/__tests__/exploitation-routes.test.ts` seulement ; les 7 autres entrées inchangées.
- Étape 4 ajoutée : clés `['listerDemandes', 'enregistrerDemande', 'traiterDemande', 'rechercherPersonne']`, ordre réel de déclaration (`personnes.ts:63` : `{ listerDemandes, enregistrerDemande, traiterDemande }`, la nouvelle route à la fin) ; longueur 4 ; interdit toute suppression et tout `toBeGreaterThan` ; aucune autre ligne du test ne change. Aucune assertion affaiblie : la boucle d'étiquettes `acces:compte` couvre aussi la nouvelle route.
- `taille_max_lignes` 200 → 210 : réaliste pour environ 4 lignes de diff en plus.
- Exigences, `depend_de`, `nouvelles_dependances`, `criteres`, tests nommés, sensibilité : inchangés.
- Aucun mot interdit, aucun prix.
- `node outils/gardes/fiches.mjs` sur la branche : code 0, « 891 fiches cohérentes » (avertissements préexistants seulement).
- Aucun autre test de main ne fige le nombre de routes `personnes` (`en-tetes.test.ts:31` parcourt `openapi.json` dynamiquement).

## Remarques
- Néant de bloquant. `ATTENDUES` dans `exploitation-routes.test.ts` reste à 3 routes, ce qui est cohérent : la nouvelle route est vérifiée par les tests nommés de L08-T33.
