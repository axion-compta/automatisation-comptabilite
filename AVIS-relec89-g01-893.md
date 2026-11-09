VERDICT: OK
SHA relu: 2a7d1da9ff5c445fb7e3ba9c65716ce6b83c6ec9

# Avis relec89-g01-893 — PR 893, fiche L11-T27 (dépendances L11-T43 et L11-T44)

Branche relue : `pilotage/L11-T27-deps`. Diff : un seul fichier, `pilotage/fiches/L11-T27.md`, 3 ajouts et 3 retraits (`git diff --numstat` sans ligne « - - »).

## Vérifications
- `depend_de` : L11-T43 et L11-T44 ajoutées ; les 7 anciennes (L11-T26, L11-T08, L11-T09, L11-T11, L11-T12, L11-T19, L01-T07) sont toutes gardées.
- À faire, point 2 : appel de `conflitBanque(jeu, id)` AVANT `proposer` et pour CHAQUE id de `valider`, sur le jeu partagé de `app.ts` ; une ligne rendue = 409 `FRAIS_PAYE_SOCIETE`, aucune écriture. La phrase reprend celle de la section « Voie choisie » de L11-T44 sur main.
- Cohérence avec L11-T44 : même nom de fonction et même signature (`conflitBanque(jeu, id)`, retour `string | undefined`), même code d'erreur (`FRAIS_PAYE_SOCIETE`, déjà au point 1 de L11-T27 au statut 409), même jeu partagé (`jeuFrais` de `app.ts`).
- Pièges : la fiche interdit l'exécution avant la fusion du code de L11-T43 et de L11-T44, et interdit un second `genererFrais()`.
- Aucun autre champ modifié : `fichiers_autorises`, `taille_max_lignes` (340), `tests_requis`, `criteres`, `exigences`, `statut` et `sensible` sont inchangés.
- Dépendances : L11-T43 est `fait`, L11-T44 est `a_faire` (dépend de L11-T43 seulement) ; aucune n'est bloquée et il n'y a aucun cycle. `node outils/gardes/fiches.mjs` sur la branche : « 891 fiches cohérentes », code de sortie 0 (avertissements REPRENDRE.md seulement, déjà présents sur main).
- Aucun mot interdit, aucun prix dans le fichier.
- Double paiement : `preparerRemboursement` (L11-T12) ne prend que les frais `valide` ; tout passage à `valide` se fait par `valider`, désormais précédé de `conflitBanque` pour chaque id. Aucun chemin ouvert n'a été trouvé.

## Remarques (non bloquantes)
- Aucun des 10 tests nommés ne vérifie le 409 `FRAIS_PAYE_SOCIETE` rendu par `conflitBanque` (dans `proposer` ou dans `valider`). La phrase impose l'appel, mais rien dans les `criteres` ne fait échouer un oubli. Ajouter dans une fiche ultérieure (ou à l'exécution, si Will l'accepte) un test du type `valider-frais-ligne-societe-libre-409`, sur le jeu sur mesure avec `LIB-002`, avec la mutation « retirer l'appel » à tuer.
- Une fois cette PR fusionnée, l'exception `partage` de L00-T64 est sans objet. Son retrait est prévu par L00-T65.
