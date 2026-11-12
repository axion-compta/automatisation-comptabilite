VERDICT: OK

PR #1162 (L19-T01), seconde relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : 6801557975ae7052034f664091f329fa1705c005

## Défauts de l'avis précédent (tête b0dad693) : tous levés, vérifiés par mutation
1. `masqueJusqu` non fini → `carte_invalide` (pile-a-verifier.ts:51). Retirer ce contrôle fait rougir un test.
2. Cas Infinity testés : `Number.isNaN` à la place de `!Number.isFinite`/`!Number.isInteger` pour groupe, tvaEnJeu et confiance → un test rouge à chaque fois.
3. `tvaEnJeu` entier exigé (`Number.isInteger`) : remplacer par `Number.isFinite` → un test rouge.

## Non-régression
- Diff : 4 fichiers, tous dans fichiers_autorises ; 236 lignes pour 240 permises. Journal : 9 lignes, commence par « # Journal L19-T01 ».
- 9/9 tests verts (Node 22). Mutations encore tuées : `tvaEnJeu < 0` retiré, `tete.length === 1` → `>= 1`.
- Aucun mot interdit, aucun secret, aucun prix ; données fictives.

## Remarques (non bloquantes)
- CI : `tests` (et donc `verifier`) rouge pour un seul test, `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues` (en-tête CSV `porte` contre `porte_rgpd`). Il est rouge aussi sur origin/main (347401ab), hors périmètre de la PR : ce n'est pas un défaut de l'auteur.
