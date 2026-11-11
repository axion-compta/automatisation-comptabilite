VERDICT: OK
b6d05ca72e60a82f59fc08b292366467f9fbbe39

# Avis PR 1045 (L06-T45, bail de lecture du personnel Axion) : seconde relecture, SENSIBLE (droits)

Relu au SHA de tête ci-dessus, après la correction qui répond à l'avis A CORRIGER du SHA 2b2902e. Fiche lue sur origin/main (82aa0a7). Fusion par Will seul.

## Défauts de l'avis précédent : vérifiés par mutation
1. Bail rattaché à la société : `Bail.societeId`, `lire(personneId, societeId)`, `actif` et `decider` reçoivent la société. Test `bail-sur-la-societe-A-aucun-acces-a-la-societe-B`.
   - mutation `lire` qui ignore la société : le test rougit ;
   - mutation `decider` qui lit toujours la société A : le test rougit.
2. Cas limites de `bailCourt` :
   - `!Number.isFinite(maxMs)` retiré : `duree-maximale-invalide-aucun-acces` rougit (NaN, Infinity, -1) ;
   - `maintenant >= debut` retiré : `avant-le-debut-ou-ordre-inverse-aucun-acces` rougit ;
   - `maxMs <= 0` retiré, ou `fin <= debut` retiré : les tests restent verts, mais ce sont des mutants équivalents (un `maxMs` négatif est refusé par `fin - debut > maxMs` ; un ordre inversé, par `maintenant >= debut && maintenant < fin`). Ce n'est pas un défaut.
3. `statut: fait` posé ; origin/main fusionnée dans la branche.
- Remarque précédente traitée : `decider` n'utilise plus `this` (test `decider-extrait-de-l-objet-fonctionne`).

## Contrôles
- Périmètre : 6 fichiers, tous dans `fichiers_autorises`. Taille : 199 + 4 = 203 pour un maximum de 250. Aucune ligne « - - ». Journal : 7 lignes, commence par `# Journal L06-T45`. Aucun mot interdit, aucun prix, données fictives, aucune durée en dur (`maxMs` en paramètre).
- Tests locaux (Node 22) : `bail-support.test.ts` 9 sur 9, `coque.test.tsx` 22 sur 22. CI verte au SHA relu (run 43092925037 : verifier, tests, e2e, gardes, types, lint, licences, gitleaks, stryker). Fusion avec main sans conflit (mergeable : clean).

## Remarques
- Le lien entre `actif(personneId, societeId)` et `ContexteBailSupport` reste à écrire par l'hôte (hors fichiers autorisés, noté au journal) : une fiche suivante devra le faire.
