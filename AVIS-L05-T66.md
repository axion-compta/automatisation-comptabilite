VERDICT: A CORRIGER

# Avis L05-T66 (PR #1039, sensible)

SHA relu : 1ebeac8674c90fdee77afe1e2abcfd3d6fe3826f (branche `lot-05/L05-T66`, un commit sur `origin/main`).
Fiche de référence : `origin/lot-00/L00-T83:pilotage/fiches/L05-T66.md` (amendée par la PR #1032, non fusionnée), avec D88 : durée D45 non fixée, paramètre daté vide par défaut, durée absente = rien n'est effacé.

## Vérifié et correct
- Périmètre : 3 fichiers, tous dans `fichiers_autorises` ; 154 lignes pour un plafond de 200 ; aucune ligne « - - ». La fiche n'est pas modifiée (attente de #1032), ce qui est accepté.
- D88 : aucune durée dans le code ; durées lues au jour D par `parametreAuJour` dans une liste de `ParametreLegal` passée en argument, vide par défaut (`listerEchus`). Paramètre absent, vide ou non `valide` : rien n'est échu, rien n'est envoyé (test `duree-absente-rien-n-est-efface`).
- Le module ne supprime rien : il passe par `envoyerEffacements` (console), avec un identifiant de décision déterministe ; un rejeu ne redemande rien. Gel actif : aucune demande (D3).
- Les 4 tests nommés de la fiche sont présents, plus `demande-transmise-a-la-console`. Ils passent localement (5/5).
- `node scripts/verifier.mjs --gardes` est vert (21 étapes) ; tsc et eslint sont propres. La CI de la PR est verte, `verifier` compris.
- Aucun mot interdit, aucun prix, aucun secret ; données fictives ; journal de 8 lignes qui commence par `# Journal L05-T66`.
- Mutations : 4 sur 6 font rougir les tests (`< 0` → `<= 0`, statut ignoré, gel ignoré, absence lue comme 0).

## Défauts (à corriger avant fusion)
1. `apps/serveur/src/chat/__tests__/echeance.test.ts:52-65` : il manque les cas limites de la durée exigés par la consigne (NaN, Infinity, non entiers, zéro, négatif). Deux mutations survivent :
   - retirer `|| !/^\d+$/.test(ligne.valeur)` (`echeance.ts:29`) ;
   - retirer `&& n > 0` (`echeance.ts:31`). Avec cette mutation, une durée `'0'` rend échu tout élément dont la dernière activité date d'avant le jour D, et son effacement est demandé. Pour une fiche RGPD sensible, c'est un effacement massif que rien ne teste.
   Correction : dans `duree-absente-rien-n-est-efface` (ou un test voisin), ajouter les valeurs `'0'`, `'-30'`, `'30.5'`, `'NaN'`, `'Infinity'`, `'1e3'` et `' 30'` pour les deux clés. Vérifier que `listerEchus` renvoie `[]` et qu'aucune demande n'est envoyée. Les deux mutations ci-dessus doivent alors faire rougir le test.

## Remarques (non bloquantes)
- Ordre inversé non testé : une `derniereActivite` postérieure au jour D (élément gardé) et une `derniereActivite` mal formée (comportement de `ajouterJours` attendu : erreur nette, pas d'effacement). Un test de chaque serait utile.
- `demanderEffacementsEchus` n'a pas de valeur par défaut pour `parametres` (seul `listerEchus` en a une). C'est acceptable puisque le paramètre est obligatoire, mais une liste vide doit rester le seul cas « rien n'est effacé ».
- Garde rouge éventuelle liée à #1032 (fiche non passée à `fait`) : non comptée, comme demandé.
