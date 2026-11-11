VERDICT: OK

Fiche L09-T43, PR #1048, SHA relu : 3f9a85095b216242201a905cb865697261a6921d
Relecture après correction. Avis A CORRIGER précédent rendu sur 42ae78dbe89c3f30ea163a4f82695a190e802275.

## Défauts précédents : contrôle
1. Message de refus : `e39.ts:25` dit désormais « Les informations précédentes ont pu être confirmées ; réessayer ne les doublera pas. » C'est exact : en cas de refus, l'identifiant de validation est gardé, donc les clés d'idempotence restent les mêmes. Le test `refus-arrete-et-informe` refuse au 2e appel (champ `siren` ajouté) et vérifie 2 appels, aucun ensuite. Mutation (ancien texte remis) : le test rougit. Mutation (on continue après un refus) : `refus-arrete-et-informe` et `idempotence-par-champ` rougissent. **Corrigé.**
2. Valeur choisie : `contradiction-choix-obligatoire` choisit la 2e valeur, valide, puis vérifie `valeur: 'autre valeur'` dans le `POST /profil/champs/regime_tva`. Mutation `options[choix[cle]!]!` → `options[0]!` : le test rougit. **Corrigé.**
3. Branche à jour : main fusionné, sans force-push. `git diff origin/main...3f9a850` : 6 fichiers seulement, tous dans `fichiers_autorises`. **Corrigé.**

## Vérifications
- Taille : 298 + 1 = 299 lignes ≤ 300 (`garde:perimetre` vert en local). Seuls des commentaires ont été retirés et des JSX mis sur une ligne. Aucun test ni aucune assertion retirés.
- Remarque précédente suivie : les blocages passent avant le profil vide (`Ecran.tsx:43-53`).
- Aucun mot interdit, aucun prix, données fictives. Journal de 7 lignes commençant par `# Journal L09-T43`.

## Tests
- `vitest run src/ecrans/e39` : 7/7 verts. tsc vert. Sur la tête et sur sa fusion d'essai avec main : `garde:textes`, `garde:appels` et `garde:perimetre` verts. Les autres gardes ont tourné sur la fusion d'essai seulement (`fictif`, `couleurs`, `actions`, `interrupteurs`, `ci`, `tests`, `termine`) : toutes vertes.
- Job CI `gardes` rouge sur ce SHA : en local, sans fusion avec main, `garde:termine` dit « L09-T43 : fait alors que L09-T37 ne l'est pas ». La branche porte encore `statut: a_faire` pour L09-T37 ; main l'a passée à `fait` après (#1057). Ce n'est pas un défaut de l'auteur. Avec main fusionné, la garde est verte.

## Remarques (non bloquantes)
- Aucun test ne couvre « blocages + aucun champ » : remettre le cas vide avant les blocages laisse les 7 tests verts.
- Le message de refus dit « ont pu être confirmées » même quand le refus porte sur le premier champ. C'est prudent et reste vrai.
