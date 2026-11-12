VERDICT: A CORRIGER

PR #1218, fiche L19-T30. Première relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : 1fc42f4de0328010f2e2f1e4e979bb0af91e0829

## Vérifié
- 4 fichiers, tous dans `fichiers_autorises` ; 123 lignes ajoutées sur 180 permises ; aucune ligne « - - » ; aucune dépendance ajoutée.
- Les 4 tests nommés de la fiche sont présents : 4 sur 4 verts. CI verte au même SHA.
- Le plan est calculé depuis `ecransDecouverts()` (`ecrans.ts`), `MENU_BUREAU`, `BARRE_MOBILE` et `MENU_PLUS` (`menu.ts`), et `CHEMIN_DISCUSSION`.
- Journal de 6 lignes, commence par « # Journal L19-T30 ». Aucun secret, prix, nom réel ni mot interdit.

## Défauts
1. `pilotage/journal/L19-T30.md:6` : la liste des écrans hors menu est fausse. Sur le plan réel, `planNavigation(ecransDecouverts()).horsMenu` vaut `["e39","informations","n08"]` (je l'ai recalculé moi-même). Le journal cite `m04`, qui est à 1 clic par « Discuter », et omet `e39` (`/demarrage/recapitulatif`).
   Correction : « Hors menu (aucun chemin d'accès) : e39 (/demarrage/recapitulatif), informations, n08 ; la discussion (m04) est à 1 clic par « Discuter ». »
2. `apps/web/src/socle/__tests__/plan-navigation.test.tsx:10` et `:22` : les tests ne portent que sur des écrans fictifs. Aucun test ne contrôle le plan réel de l'application : la règle « 2 clics au plus » (V3-UX-126) n'est donc pas vérifiée sur les vrais écrans, et l'erreur du défaut 1 est passée inaperçue.
   Correction :
   - dans `chaque-ecran-a-deux-clics-au-plus`, ajouter `expect(ecransAuDela(planNavigation(ecransDecouverts()), 2).map((n) => n.id).sort()).toEqual([...])`, avec la liste explicite des exceptions inscrites au journal (aujourd'hui `e17-frais, e44, e44-client, e45, e50, e53, n03, n04, t05`) ;
   - dans `ecran-hors-menu-signale`, ajouter `expect([...planNavigation(ecransDecouverts()).horsMenu].sort()).toEqual(['e39', 'informations', 'n08'])`.
   Tout nouvel écran à plus de 2 clics, ou hors menu, fera alors rougir les tests.

## Mutations (toutes tuées)
- Entrées « Plus » comptées à 1 clic au lieu de 2 : tuée.
- Préfixe sans « / » : tuée.
- Frontière `> max` changée en `>= max` : tuée.
- Retrait du +1 pour un écran enfant : tuée.

## Remarques (non bloquantes)
- `/reglages` n'a pas d'écran propre, mais ses sous-écrans sont comptés comme atteints par cette page : à préciser dans le journal.
- L'Accueil provisoire, qui liste tous les écrans, est ignoré par le plan. C'est cohérent avec la fiche ; une phrase en tête de `plan-navigation.ts` suffirait.
- Journal, lignes 3 et 6 : il manque l'apostrophe dans « d un » et « d accès ».
