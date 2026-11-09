VERDICT: OK

PR : 917 (fiche L11-T37, sensible)
SHA relu : 6e9c2dbe740cf6e2d5d7f04a364d5ee79caae8c8

## Défauts de l'ancien avis (relec127-g01-917)
- Défaut 1 (fiche de main) : corrigé. La PR 934 (c7e220d) est fusionnée. La fiche `pilotage/fiches/L11-T37.md` de `origin/main` autorise `apps/serveur/src/base/migrations/011-frais.sql` et `apps/serveur/src/base/__tests__/011-frais.test.ts`. `garde:termine` est vert. Mutation : je remets les anciens chemins dans la fiche, et `garde:termine` rougit (« tests_requis oui mais aucun fichier de test suivi »).
- Défaut 2 (lint `no-regex-spaces`, ligne 27) : corrigé avec `\n {2}\)`. Le lint du fichier est vert. Mutation : je remets `\n  \)`, et eslint signale de nouveau `no-regex-spaces`.

## Contrôles
- Fichiers modifiés : les 4 `fichiers_autorises`, rien d'autre. La fiche ne change que `statut: fait`.
- Taille : 153 lignes ajoutées, 1 retirée (300 au plus dans la fiche, moins de 400).
- `node scripts/verifier.mjs --gardes` : rc 0, 21 étapes vertes. `node outils/gardes/migrations.mjs` est vert.
- Tests ciblés `011-frais.test.ts` : 8/8 verts. Ce sont les 8 tests nommés.
- Mutations sur le SQL qui font rougir un test :
  - inv1 sans `statut <> 'rembourse'` ;
  - index de l'invariant 3 sans `statut <> 'refuse'` ;
  - `cumul_km` sans `IF NOT EXISTS`.
- Règle 13 (CONSIGNE-AUTEUR3) : la migration n'est jamais exécutée. Le test lit seulement le texte SQL et le passe à la garde. Aucune base, aucune adresse, aucun port, aucun identifiant ni secret.
- Journal : 8 lignes, il commence par `# Journal L11-T37`.
- Aucun mot interdit, aucun prix, données fictives. Aucune garde, aucun test ni aucune règle de lint n'est touché.

## Remarques (non bloquantes)
- Les remarques de l'ancien avis restent valables :
  - le test ne fige pas les valeurs de `energie`, `proprietaire` et `source_payeur`, ni les `REFERENCES` ;
  - le numéro 011 passe avant 057, 080 et 081, à revoir quand un outil appliquera les migrations ;
  - il n'y a pas de `societe_id`, à confirmer avec L11-T38.
- Une ligne du journal dit encore que le chemin « dépend de la PR de fiche ». C'est historique, et la PR 934 est fusionnée.
- Fiche sensible : la fusion revient à Will seul.
