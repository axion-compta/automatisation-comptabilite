VERDICT: OK
SHA relu: c0186407a91c88e4f6026f3d775102a6877ea387

# Avis relec109-g01-852 — PR 852, fiche L03-T56 (sensible), deuxième relecture

## Défaut précédent : corrigé
- `relance-idempotente` lance désormais trois passes (J, J, J+2) avec l'objet toujours listé après effacement (`relister: true`), pour `effacee_base` puis `effacee_sauvegardes`, et exige un seul appel à `effacerBase`.
- Mutation rejouée : retrait de `if (existante !== null && EFFACEES.includes(existante.statut)) continue;` = `relance-idempotente` ROUGE (1 échec / 11).
- Mutations complémentaires : `EFFACEES = ['effacee_base']` = rouge ; `EFFACEES = ['effacee_sauvegardes']` = rouge. Les deux statuts sont donc protégés.

## Rien d'affaibli
- Dernier commit : seul `trop-tot-planifiee-avec-date-prevue` est réécrit en une assertion équivalente (efface vide ET statut/datePrevue), aucune assertion perdue.
- Autres mutations : `purgePossible` retiré = 4 rouges dont `r4-gel-refuse-et-trace` (critère de la fiche) ; `> 0` remplacé par `>= 0` dans la confirmation des sauvegardes = `sauvegardes-confirmees-apres-rotation` rouge.

## Contrôles
- Fichiers modifiés : les 4 `fichiers_autorises` seulement.
- Taille : 160 + 126 + 6 + 8 = 300 lignes, dans la limite de 300 (au ras).
- Tests ciblés : 11/11 verts. `pnpm verifier` : toutes les gardes vertes (litteraux, textes, fictif, fiches, perimetre, tests…), lint et tests verts ; l'étape types n'échoue que sur le refus de moteur Node 22 du cloud, relancée avec `engine_strict=false` : verte.
- Journal : 8 lignes, commence par `# Journal L03-T56`.
- Aucun mot interdit, aucun prix, aucune durée réelle (7 ans et rotation 4 inventées, en tests), données fictives (`societe-a`, `societe-b`, `source-inventee`), aucun octet NUL, aucun import d'IA.

## Remarques (non bloquantes)
- Taille exactement à 300 : toute retouche future devra rester compacte.
