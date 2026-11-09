VERDICT: A CORRIGER

PR : 915 (fiche L04-T52, sensible)
SHA relu : 76498344dcca95b82d4ef4961a4c227e9ddeb8b8

## Contrôles
- Fichiers modifiés : les 4 `fichiers_autorises` seulement. Taille : 346 lignes ajoutées, 1 retirée. Le maximum de la fiche est 300 et le seuil du dépôt 400 : voir le défaut 3.
- Journal : 9 lignes, il commence par `# Journal L04-T52`.
- Règle 13 : prise `ServiceFiles` + faux service `FilesMemoire`. Aucune adresse, aucun port, aucun secret, rien en production. Données fictives. Aucun mot interdit, aucun prix.
- Tests ciblés : 12/12 passent. Les 5 tests nommés sont présents.
- Défauts de l'ancien avis (SHA ec6c563) :
  - Préparation en erreur : corrigé. `files.ts:110-117` passe la pièce en `en_erreur`, compte les tentatives, relance selon `prochaineRelance` et n'abandonne qu'après le dernier délai, état enregistré.
  - Branchement non testé : corrigé. Chaque exécuteur a maintenant un test.
  - Six mutations rougissent toutes un test : abandon immédiat (l.117), état non enregistré (l.116), transition en_erreur→en_erreur (l.115), décalage des tentatives (l.113), lecture sans relance (l.128) et rejeu de l'entrée non journalisé (l.91).

## Défauts
1. `apps/serveur/src/pieces/adaptateurs/files.ts:99-105` (`executeurAntivirus`) : une pièce qui a eu un verdict `indetermine` une fois ne sort plus jamais de la file antivirus. Je l'ai vérifié par une sonde (test jetable, supprimé ensuite) :
   - Relance avec un verdict `sain` : `etapeAntivirus` rend la pièce telle quelle, toujours `en_erreur` avec l'ancien `prochaineRelanceA`, déjà passé. La ligne 103 renvoie donc `{ relanceA }` et la tâche est reportée à une date déjà échue. La pièce tourne en boucle et n'atteint jamais la préparation. Résultat observé : `reporte`, puis file `compta-pieces-preparation` vide.
   - Relance avec un second verdict `indetermine` : `terminer` appelle `appliquerTransition('en_erreur', 'en_erreur')`, qui lève `transition_interdite`. `traiterUne` rend la tâche aussitôt, et la boucle ne s'arrête jamais (aucun abandon). Résultat observé : `ErreurPiece: Transition interdite : en_erreur vers en_erreur`.
   C'est le même défaut que celui corrigé pour la préparation (« 0 perte », relances selon `prochaineRelance`). Correction dans `files.ts` : avant l'appel, ramener une pièce `en_erreur` en `quarantaine` (la transition est permise) en gardant `tentatives`. Il faut aussi passer en `{ pieces: [id] }` quand le verdict est sain, et laisser l'abandon se produire après le dernier délai. Ajouter un test « indéterminé puis sain » et un test « indéterminé deux fois puis abandon ».
2. `apps/serveur/src/pieces/adaptateurs/__tests__/files.test.ts:146` : `pnpm verifier` est rouge à l'étape `types` (`tsc --noEmit` dans `apps/serveur`). `couleur: [0, 0, 0]` et `couleurFond` sont typés `number[]`, alors que `ElementTexte.couleur` attend `Couleur`, un triplet (TS2345). Le critère « pnpm verifier » de la fiche n'est donc pas rempli. Correction : typer l'objet de l'extracteur, par exemple avec `satisfies Extracteur` ou `as const` sur les triplets.
3. Taille : 346 lignes ajoutées pour un `taille_max_lignes: 300` dans la fiche, alors que le seuil du dépôt est de 400. Correction : resserrer les tests (fabriques communes pour `ContexteEntree`, réglages en double), ou faire relever le maximum par une PR de fiche. L'auteur ne doit pas l'élargir lui-même.

## Remarques (non bloquantes)
- `files.ts:119-121` : une préparation `a_verifier` (photo floue, OCR trop faible) passe la pièce en `preparee` et l'envoie à la lecture. Le motif d'origine est alors remplacé par `sensible` (`texteTransmissible` est nul). À clarifier avec la fiche de lecture.
- `files.ts:112` : les tentatives de la préparation repartent du compteur de l'antivirus (`piece.tentatives`). Une pièce relancée à l'antivirus a donc moins de relances à la préparation.
- Les remarques de l'ancien avis restent valables : la panne est rendue sans délai, l'IA indisponible est relancée sans plafond, et IMP-031 est hors périmètre.
- Le critère « T-LEC-26 rejoué sur les vraies files » attend le service de la console, comme le dit le journal.
