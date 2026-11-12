VERDICT: OK
27d12ceea94131dbb5d66454ec4245b0610ba2cb

PR #1051, fiche L08-T39, SHA de tête relu : 27d12ceea94131dbb5d66454ec4245b0610ba2cb (base main 599f7b3304c84851cf893780c6c33e18722b0f3f).
Relecture après changement de tête. Le dernier avis OK portait sur le SHA 584fdddb.

## Ce qui a changé depuis 584fdddb
- Un seul commit, `27d12cee Merge origin/main dans lot-08/L08-T39` : merge, sans rebase ni force-push. Il apporte main, dont la PR #986 (L08-T37), fusionnée en squash.
- Fond inchangé : les 6 fichiers du diff contre main sont identiques octet pour octet à ceux de 584fdddb (`git diff 584fdddb 27d12cee -- <fichier>` est vide pour chacun).
- Le diff contre main ne contient plus que les fichiers de la fiche : `DemandesPersonnes.tsx` 56, `Ecran.tsx` 3+1, `RecherchePersonne.tsx` 61, test 144, fiche 1+1, journal 10.

## Vérifications au SHA de tête
- CI : les 9 jobs sont verts, dont `gardes` (`garde:perimetre` et `garde:termine`) et `verifier`.
- `garde:perimetre` en local : vert (L08-T39, 6 fichiers, 277 lignes pour une limite de 300).
- vitest `apps/web/src/ecrans/e50` (Node 22) : 19/19.
- Les mutations de l'avis précédent portent sur un code inchangé ; elles restent valables.

## Remarques (reprises, non bloquantes)
- Tout 503 donne `reglageAbsent`, quel que soit le code renvoyé.
- Libellés des sources en dur dans `RecherchePersonne.tsx`. Ordre des imports dans le test.
