VERDICT: OK

PR #1026 (L10-T34), SHA relu : eb03d014cf8bc3ca9ab1e56fc42176202309003a.

Delta depuis l'avis OK précédent : un seul commit, eb03d014, un merge de `origin/main` (parent 91ff4669). La branche n'a reçu aucun commit de correction propre. Le test d'ordre du faux serveur est corrigé par main : PR #1010 (L00-T76, commit 14e22ec5), que ce merge intègre.
- `git diff 91ff4669 eb03d014` : seulement les 6 fichiers de la fiche (154 ajouts, 3 suppressions). Le merge n'annule rien de main.
- `packages/faux-serveur/src/__tests__/registres.test.ts` : identique à main (diff vide). La branche ne l'a ni modifié ni affaibli.

Contrôles sur la tête :
- Fichiers modifiés : 6, tous dans `fichiers_autorises`. Taille : 154 lignes, limite 220. Le registre du lot 10 ne reçoit que l'appel du domaine ventes.
- `vitest run commun-ventes.test.ts registres.test.ts` : 22 tests passent, dont le cas `ordre-garde-puis-modules-puis-socle`. ESLint et `tsc --noEmit` du paquet : aucune remarque.
- Mutations sur `packages/faux-serveur/src/domaines/ventes.ts`, chacune annulée ensuite :
  - refus 400 retiré → `query-invalide-400` et `memes-reponses-vrai-et-faux` rouges ;
  - 404 changé en 200 → `vente-inconnue-404` rouge ;
  - id du détail altéré → `detail-200` rouge.
- Journal : 7 lignes, commence par `# Journal L10-T34`. Aucun mot interdit, aucun prix, données fictives.

Remarques (non bloquantes) :
- La garde portes peut rester rouge tant que la PR #1030 (L00-T82, porte e24-ventes) n'est pas fusionnée. C'est attendu et sans lien avec ce diff.
- `suite-ventes.ts` : `query-invalide-400` ne joue ni `limite=abc` (NaN), ni `limite=1.5`, ni `limite=Infinity`. Le schéma partagé `QueryVentes` les refuse (`z.coerce.number().int()`), mais ajouter ces cas à la suite commune prouverait que les deux cibles répondent pareil.
- Journal, ligne 7 : « CI verte seulement après fusion de la PR 1010 ». La PR 1010 est fusionnée ; la phrase est périmée mais reste juste sur le fond.
