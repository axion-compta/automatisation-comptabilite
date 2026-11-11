VERDICT: A CORRIGER

# Avis L09-T43 (PR #1048, écran E39)

SHA relu : 42ae78dbe89c3f30ea163a4f82695a190e802275

## Vérifié
- Apport réel, mesuré en fusionnant la tête dans `origin/main` (L09-T37 fusionnée par #1035) : 6 fichiers, tous dans `fichiers_autorises`. Taille : 300 + 1 lignes, soit 300 ajoutées pour un maximum de 300 (à la limite).
- 7 tests nommés présents et verts (`vitest run src/ecrans/e39`, 7/7). `garde:textes` et `garde:appels` sont verts ; aucun appel hors `api.ts` ; `api.ts` n'est pas modifié.
- Mutations sur `Ecran.tsx` : l'ordre « à confirmer en tête » retiré, le bouton jamais désactivé, une clé neuve à chaque clic, le `return` retiré du `catch` et l'écran de blocage retiré font tous rougir au moins un test. Une mutation survit (défaut 2).
- Aucun nom de validateur affiché. Données fictives. Aucun prix, aucun mot interdit. Journal de 7 lignes commençant par `# Journal L09-T43`.

## Défauts
1. `packages/textes/src/ecrans/e39.ts:25` : le message de refus dit « Rien d'autre n'a été confirmé ». C'est faux dès que le refus porte sur le 2e champ ou un suivant. Les confirmations partent une à une (`Ecran.tsx`, boucle avant le `catch` l. 80), donc les champs précédents sont déjà confirmés. Correction : dire que les informations précédentes ont pu être confirmées et que réessayer ne les doublera pas. Dans `refus-arrete-et-informe` (`e39.test.tsx:131`), ajouter aussi un cas de refus au 2e appel : un seul appel suivant le refus, aucun appel ensuite.
2. `apps/web/src/ecrans/e39/Ecran.tsx:75` : rien ne vérifie la valeur retenue. La mutation `options[choix[cle]!]!` → `options[0]!` (la première valeur est envoyée quel que soit le choix de la personne) laisse les 7 tests verts. L'écran devinerait alors la valeur, ce qu'interdit la spec 09, §02 règle 8. Correction : dans `contradiction-choix-obligatoire` (`e39.test.tsx:104`), choisir la 2e valeur, valider, puis vérifier que le `POST /profil/champs/regime_tva` porte `valeur: 'autre valeur'`.
3. Branche à mettre à jour avec `origin/main` (fusion, sans force-push). Elle porte encore l'ancien commit de L09-T37 d'avant le squash de #1035. Le diff de la PR montre donc 11 fichiers, dont ceux de L09-T37, ce qui fait rougir `perimetre` et `verifier` en CI.

## Remarques (non bloquantes)
- Une fois fusionnée avec main, `garde:termine` rougit (« L09-T43 : fait alors que L09-T37 ne l'est pas »). Ce n'est pas un défaut de cette PR : #1035 a été fusionnée en laissant `statut: a_faire` dans `pilotage/fiches/L09-T37.md` sur main. Ce statut doit être corrigé sur main (fiche du lot 00, fusion par Will) avant que #1048 puisse passer au vert.
- `Ecran.tsx:45` : le cas « profil vide » est traité avant les blocages. Avec des blocages et aucun champ, l'écran affiche « Aucune information » au lieu des phrases de blocage. Inverser les deux tests.
- `Ecran.tsx` : le lien de source `/documents/<ref>` est une route supposée. `groupe: 'autre'` vient de l'absence de groupe « démarrage » dans le socle, ce qui est noté au journal.
