VERDICT: OK

Fiche L06-T40, PR #1067, SHA de tête relu : 745133fcb8641ee80dc2622aae6dba8cf61461f3
Troisième relecture (relecteur Opus, lot 5 section R, 12/11/2026), après l'avis A CORRIGER du SHA fd219c07a38c32eb1c4fa349a3b3679dd73450ce. Fiche sensible : fusion par Will seul.
Relu : ce que la fiche ajoute (le diff contre main contient encore les fichiers de L06-T39, PR #1052, toujours ouverte).

## Défaut de l'ancien avis, vérifié par mutation
1. `MERGE INTO` et `COPY ... FROM` : **corrigé** (`outils/gardes/audit.mjs:10`).
   - `ecriture-hors-service-refusee-par-la-garde` refuse `MERGE INTO a_compta.tete_journal ...`, `COPY a_compta.entree_journal FROM STDIN` et `COPY a_compta.entree_journal (motif) FROM STDIN`.
   - Nouveau test `lecture-par-copy-to-permise` : `COPY a_compta.tete_journal TO STDOUT` reste permis.
   - Mutations, chacune fait rougir 1 test sur 7 : `merge\s+into` retiré ; branche `copy ... from` retirée ; `from` élargi en `(?:from|to)`.

## Vérifications
- Fichiers de la fiche : 6, tous dans `fichiers_autorises` ; 293 lignes propres ≤ 300.
- `node --test outils/gardes/test/audit.test.mjs` : 7/7 verts ; `vitest run apps/serveur/src/__tests__/service-audit.test.ts` : 6/6 verts ; `node outils/gardes/audit.mjs` : vert sur le dépôt.
- Journal 8 lignes, commence par `# Journal L06-T40`. Aucun mot interdit, aucun prix, données fictives.

## CI au SHA de tête
- `gardes` et `verifier` sont rouges pour la seule `garde:perimetre`. Reproduit en local : fichiers hors liste `092-securite.sql`, `migration-securite.test.ts`, fiche et journal de L06-T39, et taille 444 > 300. Tout cela vient de L06-T39 (#1052, empilée, encore ouverte) : ce n'est pas un défaut de l'auteur. Après la fusion de #1052 puis un `git merge origin/main`, il reste 293 lignes.
- `garde:termine` est verte. Les autres jobs sont verts.
- Ordre de fusion : #1052, puis #1067.

## Remarques (non bloquantes, reprises)
- Un nom de table construit par concaténation échappe à toute garde statique (limite connue, DEMANDE 2).
- `update-delete-refuses` (T-JRN-4) teste toujours le faux dépôt seulement ; `tete_absente` toujours inutilisé.
