VERDICT: OK
916b2b31d80b21ef79280c9e9abefa10cd6256dc

# Avis L24-T28 (PR n°1145), relecteur Opus

- Périmètre : 6 fichiers, tous dans `fichiers_autorises` ; 174 lignes ajoutées (max 250).
- Tests nommés présents (6/6) ; 8 tests passent en local.
- CI verte (gardes, lint, types, tests, e2e, gitleaks, stryker, licences, verifier).
- Aucun mot interdit, aucun secret, aucun prix ; données fictives (« Fournisseur fictif »).
- Mutations tuées : filtre `societeId` inversé, `pieceId ?? ''` vidé, filtre `ligneId` retiré, contrôle `NaN` d'horodatage retiré, tri retiré ou inversé, `refuse → defaite` changé.

## Remarques (non bloquantes)
- Mutants équivalents qui survivent : `|| a.rang - b.rang` retiré (le tri JS est stable) ; `ETAT_PAR_ACTION[action]` remplacé par `ETAT_PAR_LIEN[apres.etat]` (les tests ont toujours une action cohérente avec `apres.etat`). Un test avec une entrée incohérente fixerait la source de vérité.
- Le journal réel (`validation.ts`) ne produit que l'action `valider` ; `proposer` et `defaire` n'ont pas encore d'émetteur, et aucun état `refuse` n'est possible dans l'historique alors que `etatDuLien` le gère.
- La fiche prévoit `exporterRapprochement(lignes)` ; le second argument `societeId` est justifié par le test `aucune-donnee-hors-societe` et signalé dans la PR.
- Le journal annonce 8 tests, le corps de la PR 9 : il y en a 8.
