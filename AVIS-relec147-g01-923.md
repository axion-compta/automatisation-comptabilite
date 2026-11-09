VERDICT: OK
SHA relu : 0eb3f060d92453dbe3c5ce8300b72693adbd677e

Relecture de la PR #923 (fiche L03-T45, sensible: non, branche lot-03/L03-T45). C'est une nouvelle relecture après l'avis relec123-g01-923 (A CORRIGER).

Défaut de l'avis précédent : corrigé
- Declaration.tsx:22-45 et 64 : le composant local `SourcesCase` remplace `Provenance`. Il liste les écritures source (« Écriture <id> ») sans aucun montant par ligne. Le total de la case n'est affiché qu'une fois, à côté du libellé. L'écran n'invente donc plus de montant par écriture. Le bouton garde `aria-expanded` et `aria-controls`.
- Test `provenance-liste-les-ecritures` : il vérifie maintenant que le total apparaît exactement une fois dans la case et qu'aucune écriture source ne le contient. Le `await monter()` sans assertion a été retiré.
- Mutations qui rougissent : montant de 15,00 € remis sur chaque écriture, total affiché deux fois, sources jamais listées.

Vérifié
- Fichiers modifiés : les 6 fichiers sont dans `fichiers_autorises` ; aucun texte de L03-T44 n'est supprimé dans `e19.ts`.
- Taille : 257 lignes, sous la limite de 300 ; aucune ligne « - - ».
- Les 6 tests nommés sont présents, avec les cas « néant » et « source sans libellé ». Vitest e19 : 13/13 verts.
- CI verte sur le SHA de tête (verifier, gardes, gitleaks, lint, types, tests, stryker, e2e, licences).
- Aucun prix, aucun mot interdit, aucun texte en dur ; les données sont fictives (X01, ECR1). Le journal fait 7 lignes et commence par `# Journal L03-T45`.

Remarques (non bloquantes)
- pilotage/journal/L03-T45.md:6 : la ligne « montant de la case repris » décrit l'ancienne version. Il faut la réécrire, par exemple « aucun montant par écriture : le contrat ne le fournit pas ». Il faut aussi noter une fiche de suite : montant par ligne source dans le contrat, puis retour au composant `Provenance`.
- Declaration.tsx:31 : la mutation `hidden={false}` survit. Aucun test ne vérifie que la liste est fermée au départ puis s'ouvre au clic.
- Le test ne détecte qu'un montant égal au total de la case. Un montant différent, inventé pour chaque écriture, passerait. Le risque est faible, car `SourcesCase` ne reçoit que `ecritureId`.
- La remarque précédente sur `idDeclaration` (PERxxx → DECxxx) reste à signaler pour une fiche de contrat.
