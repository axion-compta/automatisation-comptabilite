VERDICT: OK
SHA relu: 65360c8d375a5df90190b8aeb214dfb6ee1b1466

# Avis relec132-g01-929 — PR 929, fiche L07-T21 (sensible: non)

Note : la PR a été fusionnée (2026-11-09 12:23 UTC) pendant la relecture ; l'avis porte sur le SHA ci-dessus.

## Contrôles
- Fichiers modifiés : les 8 fichiers sont tous dans `fichiers_autorises` ; ni `handlers.ts`, ni `app.ts`, ni le contrat touchés.
- Taille : 260 lignes (`git diff --numstat`, aucune ligne « - - ») pour `taille_max_lignes: 260`.
- Tests : les 6 tests nommés sont présents dans le test du service et dans la suite commune, rejouée sur le vrai serveur (Fastify + oRPC) et sur le faux (MSW). 19 tests verts en local.
- Mutations (toutes rougissent) : retrait de l'idempotence par clé (1 échec), retrait de l'enregistrement de l'acceptation (3), retrait de la traduction `version_perimee` (3), retrait de l'écriture au journal (2).
- `tsc --noEmit` sur tout le dépôt : vert. Gardes de `scripts/verifier.mjs` : toutes vertes (seule l'étape d'installation échoue, à cause du Node 22 du cloud).
- Règle 13 (auteur3) : aucune adresse, aucun port ni secret en dur (`http://exemple.fr` fictif dans le test seulement) ; identité fictive (`personne-fictive-1`, `organisation-fictive-x`), service en mémoire, rien en production.
- Journal : 4 lignes, commence par `# Journal L07-T21`. Données fictives, aucun prix, aucun mot interdit, aucune garde affaiblie.

## Remarques (non bloquantes)
- `packages/contrat/src/domaines/acceptations-service.ts:8` : `TYPES_REQUIS = ['cgv']` au lieu de `['cgv_compta']` demandé par la fiche, pour suivre le jeu fictif. L'écart est noté au journal ; Will doit le confirmer avec le point Q7 de la spec.
- Avec la même clé et un corps différent, le service renvoie la première réponse sans signaler le conflit. C'est acceptable en mémoire, mais à revoir quand le stockage réel sera branché.
- L'idempotence n'est tuée que par le test unitaire (longueur du journal) : la suite commune ne la distingue pas d'une seconde acceptation réussie.
