VERDICT: OK
SHA relu : 78a2b542bba3008443363151e20dd0f7c0b19c41

# Avis de relecture, PR 940 (fiche L15-T52), branche lot-15/L15-T52, deuxième relecture

## Suivi des 2 défauts de l'avis précédent (SHA 91b68e6)
1. **Mot interdit** : corrigé. `apps/web/src/donnees/actions-alerte.ts:13` dit maintenant « Corps vérifié selon le contrat ». Recherche des 5 mots interdits sur les fichiers de la PR : aucun résultat.
2. **`conflit-409-relit` ne vérifiait pas la relecture** : corrigé. `cloche.test.tsx` (`poster('409')`) fait répondre une liste vide aux `GET /alertes` après le 409 et exige 0 carte et le texte « vide ». Mutation refaite : suppression de `relireApresAction(client, [racine + '/alertes'])` dans le `catch` de `Cloche.tsx:51` → `conflit-409-relit` rougit (8 sur 9). Annulée ensuite.

Le dernier commit (78a2b54) retire seulement une ligne vide.

## Contrôles faits
- Fichiers modifiés : les 7 font partie des `fichiers_autorises`. `api.ts`, `lecture.tsx`, `.github/` et les gardes ne sont pas touchés. Aucune dépendance n'est ajoutée.
- Taille : 299 lignes ajoutées et 1 supprimée, pour 300 au plus (`git diff --numstat origin/main...`, aucune ligne « - - »).
- Tests : `cloche.test.tsx` passe en entier (9 sur 9). Les 9 tests nommés sont présents.
- `node scripts/verifier.mjs` (Node 22, `npm_config_engine_strict=false`) : les 24 étapes sont vertes.
- Règle 13 (CONSIGNE-AUTEUR3) : appels par `api.ts` et faux serveur seulement, aucune adresse, aucun port, aucun secret. Données fictives (`EX2026`).
- Journal : 4 lignes, il commence par `# Journal L15-T52`. Aucun prix.

## Remarques (non bloquantes)
- Celles de l'avis précédent restent valables : la table `cles` n'est jamais purgée après un échec, et la section des notifications n'affiche ni chargement ni erreur.
