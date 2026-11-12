VERDICT: A CORRIGER

PR #1183, fiche L22-T23, tête 0bab11d716f8f466943bbd3ffe6d88f01f803fb7 (seconde relecture, relecteur Opus, lot 5). Avis précédent : A CORRIGER sur ca2bacb09e65ace28955818d822224fc3111e34e.

## Défauts précédents
1. Levé. La validation au centime dans `compare` (`banc-reel.mjs:30`) est maintenant couverte par le test `valeurs-non-entieres-des-deux-cotes-en-ecart`. La retirer fait rougir 1 test.
2. Levé en partie seulement. Le test `reimport-reel-sur-doublons-noyau` construit un importeur sur `numeroterOccurrences` et `lignesNouvelles` de `doublons.ts` et le vérifie sur un relevé fictif : 2 lignes identiques le même jour, 0 ligne au réimport, 1 nouvelle occurrence créée. C'est bien. En revanche, cet importeur n'est pas injecté dans le test du banc réel. `outils/banc/test/banc-reel.test.mjs:35` appelle toujours `lancerBancReel(process.env)` sans `{ importeur }`. Sur la machine du banc, la vérification `reimport` passe donc encore par l'import simulé par identifiant (`banc-reel.mjs:34-43`) : un `Set` neuf, 0 ligne créée par construction. Elle ne peut toujours pas échouer, alors que la fiche demande de vérifier sur le banc réel qu'un réimport du même relevé crée 0 ligne.
   Correction demandée : sortir `importeur` de `reimport-reel-sur-doublons-noyau` et le placer au niveau du module du test, puis appeler `lancerBancReel(process.env, { importeur })` à la ligne 35. Le changement est presque neutre en lignes (le diff est à 300 pour un maximum de 300).

## Régressions : aucune
- `banc-reel.mjs` est inchangé depuis la tête précédente. Les tests ont seulement reçu des ajouts.
- La remarque précédente sur `lignesCreees === 0` remplacé par `<= 0` est levée : le test `reimport-importeur-aberrant-ecart` rougit.
- 6 fichiers, tous dans `fichiers_autorises` ; 300 lignes pour un maximum de 300 ; 17 tests réussis et 1 ignoré (banc réel absent) en local ; journal de 6 lignes ; aucun mot interdit, aucun prix, aucun chemin réel.

## Remarques (non bloquantes)
- Toujours ouvertes : `?? NaN` remplacé par `?? 0` (ligne 79) survit, et supprimer le dédoublonnage `unique` (lignes 62-69) survit aussi.
- Une fois l'importeur réel branché, `unique` filtre par `id` avant l'importeur. Si le vrai relevé n'a pas d'`id`, toutes les lignes ont `id` indéfini et une seule passe au réimport. À confirmer avec le format du vrai banc (hypothèse déclarée dans la PR).
- CI : `tests` est rouge à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`), qui rougit aussi sur origin/main 347401ab. `verifier` est rouge parce qu'il en dépend. Ce n'est pas un défaut de l'auteur.
