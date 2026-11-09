VERDICT: OK
SHA relu: eb912fac0e19f700d889706ad6865ace1c5a4a85

# Avis relec105-g01-800 — PR 800, fiche L15-T34 (faux serveur : alertes, liste et compteurs)

## Vérifications
- Fichiers : 5 modifiés, tous dans `fichiers_autorises` ; `handlers.ts` et `contrat-commun.test.ts` non touchés. `garde:perimetre` vert (171 lignes ≤ 300).
- Main : la fusion eb912fa reprend main (e6fffd9) sans perte (diff triple point limité aux 5 fichiers) ; fusion avec le main actuel (7dc31d2) sans conflit.
- Garde des portes (simulée en PR) : vert, porte `e01` présente sur main (datée, valideur Will).
- Tests : `contrat-commun.test.ts` (suite alertes sur vrai ET faux serveur) et `alertes.test.ts` verts ; `it.todo` remplacé. Cas limites présents : NaN, Infinity, non entier, 0/101, décalage négatif, champ inconnu, paramètre répété, 404 sur les deux routes.
- `verifier` local : tests (690 fichiers), gardes et lint verts ; `types` en échec uniquement à cause du Node 22 du cloud, `tsc --noEmit` du paquet vert. CI de la PR : 9 contrôles verts.
- Mutations sur `domaines/alertes.ts` : paramètre répété accepté → rouge ; 404 retiré des compteurs → rouge ; latence retirée des compteurs → rouge. Annulées.
- Journal : 6 lignes, commence par `# Journal L15-T34`. Aucun mot interdit, aucun prix, aucune donnée réelle (hôte exemple.fr).

## Remarques (non bloquantes)
- `packages/faux-serveur/src/domaines/alertes.ts:12` : le refus des champs inconnus fait doublon avec `QueryAlertes` (déjà `strictObject`) ; une mutation qui le retire reste verte. Sans risque.
- `packages/faux-serveur/src/__tests__/alertes.test.ts:21` : « les-reponses-sont-des-copies » lit deux fois sans rien modifier entre les deux ; il ne prouve pas grand-chose (en HTTP, les copies vont de soi).
