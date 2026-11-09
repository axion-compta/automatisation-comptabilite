VERDICT: A CORRIGER
SHA relu : ad2cb408f2d0f7d2397c989ba7a2c37b869b29dc
PR 890 — fiche L06-T05 (sensible, droits), branche lot-06/L06-T05. 2e relecture, après correction.

## Les 4 défauts du 1er avis (relec86-g01-890)
1. Mutant `PERMISSION_DE_L_ACTION[action]` à la place de `[effective]` : il est tué (1 test rouge, `permission-de-l-action-effective-et-demande5-verrouillees`). Corrigé.
2. Mutant `{ demande5: true }` : il est tué (1 test rouge, même test). Corrigé.
3. `separationTaches` absent, `null`, `'true'` ou `0` : sondes faites, chaque cas lève `ErreurSecurite`, code `argument_invalide`. Corrigé.
4. `gravite` à `'Bloquant'`, `'BLOQUANT'`, `' bloquant'`, `'mineur'`, `''`, `null`, `NaN`, `Infinity`, `1.5`, `-1` ou `{}` : sondes faites, chaque cas lève `argument_invalide`. Si `gravite` est `undefined`, le comportement attendu est gardé. Corrigé.

## Contrôles passés
- Fichiers : les 4 fichiers modifiés sont dans `fichiers_autorises`.
- Taille : 194 lignes ajoutées et 1 retirée, sous la limite de 300. Aucune ligne « - - », aucun octet NUL.
- Journal : 7 lignes, il commence par `# Journal L06-T05`.
- Tests : vitest donne 16/16 vert. eslint et tsc ne signalent rien.
- Ordre des refus, sondé : personnel Axion avant la permission et le mode, permission absente avant la case N (`role_lecture` ou `role_insuffisant`), case M (`perimetre_expert`) avant la séparation, séparation avant le mode. Le mode renvoie `mode.raison`. Avec `lever_majeur` sur un objet bloquant, l'action est traitée comme `lever_bloquant`.
- Refus par défaut : avec des permissions vides, aucune des 84 combinaisons rôle × action n'est permise. Un rôle, une action ou une permission dont la casse diffère est refusé. `__proto__` et `toString` lèvent une erreur. `perimetreRespecte: 'true'` est refusé.
- Le tableau des actions permises quand le rôle a toutes les permissions suit la matrice : pour le personnel Axion, seule la lecture passe.
- Autres mutations rejouées à la main, toutes tuées : retrait de la case N, périmètre M, condition auteur de la séparation, drapeau `separationTaches`, condition personnel Axion, retrait du mode, `role_lecture` donné à un autre rôle, retrait de la conversion vers bloquant, validations de la gravité et de `separationTaches`.
- Stryker, limité à `autoriser.ts` : 94,55 % (104 mutants tués, 6 survivants), au-dessus du seuil de 80.
- Aucun mot interdit, aucun prix, aucun secret, aucune donnée réelle. Le mot « jeton » vient du titre de la fiche.

## Défaut
1. `packages/noyau/src/securite/autoriser.ts:34` : le mutant Stryker `ConditionalExpression` survit. Il remplace `action === 'lever_majeur' && …` par `true && …`. Ce mutant n'est pas équivalent et il ouvre un droit à tort : un administrateur qui a `compta-lever-bloquant` mais pas `compta-valider` demande `valider` sur `{ gravite: 'bloquant' }`. L'action est alors traitée comme `lever_bloquant` et elle est permise. Le code actuel refuse bien, mais aucun test ne verrouille ce refus. La fiche exige pourtant que chaque branche soit tuée par un test. Correction : dans `autoriser.test.ts`, ajouter le cas administrateur avec `PERMISSIONS` sauf `compta-valider`, qui demande `valider` sur `{ gravite: 'bloquant' }`. Résultat attendu : `{ permis: false, raison: 'role_insuffisant' }`. J'ai vérifié qu'avec ce test, le mutant rougit.

## Remarques (non bloquantes)
- Le mutant manuel `actionsRetirees.includes(action)` à la place de `includes(effective)` survit lui aussi : un mode qui retire `lever_bloquant` laisserait passer `lever_majeur` sur un objet bloquant. Un test peut le couvrir : administrateur avec toutes les permissions, mode `{ actionsRetirees: ['lever_bloquant'] }`, `lever_majeur` sur un objet bloquant, raison attendue `mode.raison`. J'ai vérifié qu'il rougit avec ce mutant. On peut l'ajouter avec le défaut 1.
- Les tests d'entrée invalide vérifient seulement la classe `ErreurSecurite`, pas le code : 3 mutants Stryker qui remplacent `'argument_invalide'` par `""` survivent. Vérifier aussi `code: 'argument_invalide'` (par exemple avec `toMatchObject`).
- Les tests ne verrouillent pas `mode.raison` : le remplacer par `'mode_saisie_seule'` en dur n'est pas détecté. Utiliser une autre raison dans un test, par exemple `arret_urgence`.
- Avec `mode.raison` invalide, la raison inconnue est renvoyée telle quelle. Avec `actionsRetirees` absent, l'appel lève une `TypeError`. Dans les deux cas, l'action reste refusée et aucun droit n'est ouvert.
- `pnpm verifier` n'a pas été relancé ici : le journal le laisse à la CI.
