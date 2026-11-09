VERDICT: OK
SHA relu : 1bf0aa438fd313fea7ef1054cb3000874a9c106f
PR 890 — fiche L06-T05 (sensible, droits), branche lot-06/L06-T05. 3e relecture, après correction.

## Suite du 2e avis (relec91-g01-890)
- Défaut 1, mutant `action === 'lever_majeur' && …` remplacé par `true && …` (autoriser.ts:34) : il est tué. Un test rougit : `gravite-bloquant-ne-change-que-lever-majeur`, avec un administrateur sans `compta-valider` qui demande `valider` sur un objet bloquant. Résultat attendu : `role_insuffisant`. Corrigé.
- Remarque, mutant `actionsRetirees.includes(action)` : il est tué. Un test rougit, avec le mode `{ actionsRetirees: ['lever_bloquant'] }` et `lever_majeur` sur un objet bloquant. Résultat attendu : `arret_urgence`. Corrigé.
- Remarque, `mode.raison` remplacé par `'mode_saisie_seule'` en dur : le mutant est tué maintenant (raison `arret_urgence`).

## Contrôles passés
- Code de production : `git diff ad2cb408 1bf0aa43` ne touche que `autoriser.test.ts` (+9 lignes) et le journal (+1 ligne). `autoriser.ts` n'a pas changé.
- Autres mutations rejouées à la main, toutes tuées : séparation sans condition d'auteur, périmètre M retiré, `role_lecture` inversé, case N retirée, `mode.raison` en dur, conversion vers bloquant déclenchée par toute gravité.
- Tests : 17/17 sur `autoriser.test.ts`. Noyau complet : 408 fichiers, 3978 tests verts et 3 todo. tsc et eslint ne signalent rien.
- Fichiers : les 4 fichiers modifiés sont dans `fichiers_autorises`. Taille : 204 lignes ajoutées et 1 retirée, sous la limite de 300. Aucune ligne « - - », aucun octet NUL.
- Journal : 8 lignes, il commence par `# Journal L06-T05`.
- Aucun mot interdit, aucun prix, aucun secret. Les données sont fictives.

## Remarques (non bloquantes)
- Le mutant `ACTIONS_ECRITURE.includes(action)` à la place de `includes(effective)` (autoriser.ts:37) survit. Il est équivalent : `lever_majeur` et `lever_bloquant` sont toutes deux des actions d'écriture. Aucun droit n'est ouvert.
- Les tests d'entrée invalide vérifient toujours la classe `ErreurSecurite`, pas le code `argument_invalide`. Ce point vient du 2e avis.
- Stryker et `pnpm verifier` n'ont pas été relancés ici : ils sont laissés à la CI. Fiche sensible : la fusion revient à Will.
