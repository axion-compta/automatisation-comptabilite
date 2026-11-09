VERDICT: A CORRIGER
SHA relu: 7db80feb647fdfcd88966dd332063be78535d083
PR 936 — L05-T53 : la discussion s'affiche en colonne de droite sur le bureau, et « Discuter » ouvre M04 sur téléphone. Correction de correcteur123 relue (commit 7db80fe).

## Défaut
1. `apps/web/src/socle/Coque.tsx:13` et `:29` — nouvelle clé `localStorage` `axion.colonne-discussion.repliee` non déclarée dans `docs/traceurs.md`.
   - Le registre V3-PLA-177 affirme « aucun » stockage local, et toute clé doit y figurer.
   - Le test `traceurs.e2e.ts` ne le voit pas, car il charge les pages sans cliquer : la clé n'est écrite qu'au premier repli. Dès qu'un utilisateur replie la colonne, le registre publié devient faux.
   - Correction demandée : avant la fusion, ajouter dans `docs/traceurs.md` une ligne pour cette clé (stockage local, préférence d'affichage, durée, justification : strictement nécessaire).
   - `docs/traceurs.md` n'est pas dans `fichiers_autorises` : Will doit élargir la fiche, ou faire passer d'abord une fiche dédiée.

## Question de la routine : l'e2e et les deux boutons « Envoyer »
- `apps/web/e2e/` n'est pas modifié par la PR, donc aucune assertion n'est retirée ni affaiblie.
- En revanche, le test ne cible pas chaque bouton. La correction retire la colonne de discussion sur l'écran technique `/essai` : constante `CHEMIN_ESSAI` dans `Coque.tsx:15` et condition ligne 48. `pannes.e2e.ts` ne trouve donc plus qu'un seul « Envoyer ».
- C'est acceptable, puisque l'e2e n'est pas dans `fichiers_autorises` et que `/essai` est un écran d'essai, pas un écran métier. Le comportement est couvert par le nouveau test `pas-de-colonne-sur-l-ecran-d-essai`.
- Voir la remarque 1 pour une version plus propre.

## Contrôles passés
- Fichiers modifiés : 9, tous dans `fichiers_autorises`.
- Taille : 227 lignes, sous la limite de 260 ; aucune ligne « - - ».
- Journal : 7 lignes, commence par `# Journal L05-T53`.
- Les 8 tests nommés sont présents. L'ancien test `discuter-ouvre-la-palette` est remplacé par `discuter-ouvre-m04`, comme le demande la fiche, et la palette reste testée par Ctrl+K.
- `vitest run apps/web` : 35 fichiers et 349 tests passent.
- e2e `pannes` et `accessibilite` lancés avec Playwright (Chromium local) : 11 sur 11 passent, dont les 4 contrôles axe.
- Mutations faites à la main, toutes rougissent puis ont été annulées :
  - ne plus écrire le stockage fait rougir `etat-replie-memorise` ;
  - remettre la colonne sur `/essai` fait rougir `pas-de-colonne-sur-l-ecran-d-essai` ;
  - neutraliser `hidden` fait rougir `colonne-repliable-au-clavier` ;
  - retirer le `try` à la lecture fait rougir `stockage-indisponible-sans-plantage`.
- Aucun texte écrit en dur (les textes viennent de `e25` et `socle`), aucun secret, aucun prix, aucun mot interdit. Règle 13 sans objet : front seul, aucun service de la console.

## Remarques (non bloquantes)
1. Le chemin d'essai écrit en dur dans la coque crée un couplage entre le code produit et un test. Plus propre : une fiche qui autorise `apps/web/e2e/pannes.e2e.ts` et y limite le sélecteur à `page.getByRole('main').getByRole('button', { name: 'Envoyer' })`, puis qui retire `CHEMIN_ESSAI`.
2. Le registre des traceurs n'est vérifié qu'au chargement des pages. Une fiche pourrait ajouter au test des traceurs un clic sur la bascule de la colonne, pour que ce genre d'oubli soit détecté.
