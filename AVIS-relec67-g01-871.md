VERDICT: A CORRIGER
SHA relu : eafb484c329348324d825c02639212e430e8c00f (branche lot-01/L01-T47, PR 871, fiche L01-T47)

## Points vérifiés
- Diff : seul `pilotage/fiches/L01-T47.md` (8 ajouts, 3 retraits), dans le périmètre.
- Fiche : 15 champs, tableaux JSON valides, aucun guillemet double interne ; `node outils/gardes/fiches.mjs` : 887 fiches cohérentes (un avertissement : e44/Ecran.tsx est partagé avec L10-T49).
- Aucun mot interdit, aucun prix, aucun octet NUL.
- `packages/contrat/src/__tests__/plan.test.ts` (77 lignes) et `tiers.test.ts` (73 lignes) existent sur main et testent bien `plan-service`/`tiers-service`.
- Les trois refus (`decalage` -1, `total` 2.5, `body` absent) et le cas valide sont décrits pour chaque schéma. La taille de 180 lignes suffit largement pour ce qui est demandé.

## Défauts bloquants
1. `pilotage/fiches/L01-T47.md:22-30` : la fiche est déjà réalisée sur main. Elle mènerait à une PR vide ou à des tests en double.
   - Étape 1 : `ReponseExercices`, `ReponsePlan` (`packages/contrat/src/domaines/plan.ts:33-34`) et `ReponseTiers` (`tiers.ts:15`) sont déjà exportés et construits avec l'enveloppe.
   - Étape 2 : n03 (ligne 1), n04 (ligne 3) et e44 (ligne 2) importent déjà ces schémas. Plus aucune copie locale de l'enveloppe n'existe : il ne reste que l'alias de type `Reponse` dans `n03/Ecran.tsx:10`.
   - Étape 3 : `packages/contrat/src/__tests__/reponses.test.ts` couvre déjà les trois schémas. Il vérifie `decalage` négatif, `total` 2.5, `body` absent, plus NaN, Infinity, non entier, champs absents, objet vide et trois cas valides. Il vérifie aussi que chaque route renvoie bien ce schéma de sortie.
   - Mutations faites sur la branche : retirer `.min(0)` de `decalage` dans `plan.ts` fait rougir 2 tests, et retirer `.int()` de `total` dans `tiers.ts` en fait rougir 1. Le critère « le test du contrat doit rougir si une borne est retirée » est donc déjà tenu.
   Correction demandée : passer la fiche en `statut: fait`, avec une note qui renvoie à `reponses.test.ts` et aux imports existants, au lieu d'ajouter plan.test.ts et tiers.test.ts. Sinon, réécrire la fiche sur le seul reste éventuel (remplacer l'alias `Reponse` de n03 par `z.infer<typeof ReponseExercices>`), sans tests en double.
2. `pilotage/fiches/L01-T47.md:24` : « importer ces schémas depuis `@axion/contrat` » est irréalisable dans le périmètre. `packages/contrat/src/index.ts` n'exporte ni plan ni tiers, et `apps/web` n'a pas de dépendance `@axion/contrat`. Il faudrait toucher un fichier non autorisé et ajouter une dépendance. Tous les écrans importent par chemin relatif, et c'est déjà le cas ici. Correction demandée : retirer cette formulation ou l'aligner sur l'import relatif.

## Remarques
- `pilotage/fiches/L01-T47.md:20` (Contexte) : « les écrans recopient la fonction `enveloppe` » n'est plus vrai sur main. À mettre à jour en même temps.
- Tests lancés : `vitest run` sur reponses, plan et tiers : 3 fichiers, 13 tests au vert.
