VERDICT: A CORRIGER
2214cd47f04f0c4b0d79cb46794d3a3526d38b62

# Avis PR 986 (L08-T37, demandes des personnes) : 4e relecture, SENSIBLE (données de personnes)

Relu au SHA de tête ci-dessus. Fiche lue sur origin/main (`sensible: oui`) : fusion par Will seul. Avis précédent : 3e relecture au SHA 032c654.

## Ce qui est tenu
- Périmètre : 6 fichiers, tous dans `fichiers_autorises`. Taille : 240 + 20 = 260 pour un maximum de 260. Aucune ligne « - - ». Aucun mot interdit, aucun prix, aucun secret. Données fictives (`Camille Exemple`, `exemple.fr`). Journal : 5 lignes, commence par `# Journal L08-T37`. La branche fusionne sur main sans conflit.
- `commun-personnes.test.ts` : 19 sur 19 en local (Node 24). CI : `tests`, `types`, `lint`, `gardes`, `gitleaks`, `licences` et `stryker` sont verts.
- Défaut 3 précédent (`statut: fait`) : **corrigé**.
- Nouveau test `service-cree-a-la-premiere-requete-seulement`. Mutation « service créé au montage » : le test rougit. Mutation « cache retiré, service recréé à chaque requête » : 4 tests rougissent (`enregistrer-puis-lister`, `traiter-refus-sans-source-422`, `traiter-deux-fois-409`, `etat-propre-a-chaque-instance`). Les deux mutations ont été annulées. Le cloisonnement par instance tient.

## Défauts bloquants
1. **CI `e2e` toujours rouge, avec les mêmes 11 échecs (accessibilite ×4, pannes ×7), donc `verifier` rouge** : le critère « pnpm verifier » n'est pas tenu. La création différée du service ne corrige rien. Le plantage ne vient pas de l'appel à `createHash`. Il vient de l'**import statique** : en mode dev, Vite réécrit `import { createHash } from 'node:crypto'` en un accès évalué au chargement du module. Trace locale (`vite --mode simule`, `/essai`) : `Cannot access "node:crypto.createHash"` à `donnees-fictives/src/rgpd.ts:1:50`, et aucun titre ne s'affiche. La chaîne d'import est statique : `faux-serveur/src/domaines/personnes.ts:2` → `personnes-service.ts` → `rgpd.ts`.
   **Correction possible DANS le périmètre** (vérifiée en local, puis annulée) : dans `packages/faux-serveur/src/domaines/personnes.ts`, n'importer `creerServicePersonnes` qu'en type, puis charger le module à la première requête par `await import('../../../contrat/src/domaines/personnes-service.js')`. Le service devient asynchrone (`const s = await service()`), et `ErreurPersonnes` se reconnaît par la classe du module chargé. Avec ce changement, `/essai` affiche « Écran de test », comme sur main. Il faut ajouter un test qui échoue si l'import redevient statique. Autre voie : une fiche corrective sur `rgpd.ts` (empreinte pure), à décider par Will.
2. **Décision de Will (pas un défaut de l'auteur)** : `traiter-refus-sans-source-422` vérifie par HTTP le 422 `ISSUE_NON_PERMISE`. La règle `SOURCE_MANQUANTE`, elle, n'est prouvée que sur le service (`commun-personnes.test.ts`), car les options des serveurs n'exposent ni `concernes` ni `gel`. C'est à Will d'accepter cette preuve ou de demander une fiche corrective.

## Remarques
- Sur main, le mode simulé journalise déjà une autre erreur `node:crypto.createHmac` au moment de `GET /preferences`. Elle est antérieure à cette PR et ne fait pas échouer l'e2e.
- Le cloisonnement entre sociétés repose sur une instance de service par société (`societeId` est pris dans le jeu fictif). Il sera à revoir quand le stockage réel arrivera.
