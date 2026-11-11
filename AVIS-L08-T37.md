VERDICT: A CORRIGER
032c654a70f703deea41970ae89200d917ae5cd8

# Avis PR 986 (L08-T37, demandes des personnes) — 3e relecture, SENSIBLE (données de personnes)

Relu au SHA de tête ci-dessus, fiche lue sur origin/main (`sensible: oui`) : fusion par Will seul. Avis précédent : branche `avis/986` (SHA 2c75454). La PR #1016 (L00-T79) est fusionnée et incluse dans la branche.

## Ce qui est tenu
- Périmètre : 5 fichiers, tous dans `fichiers_autorises`. Taille : 241 + 19 = 260 pour un maximum de 260. Aucune ligne « - - », aucun octet NUL, aucun alias de `it`/`test`, aucun mot interdit, aucun prix, données fictives (`Camille Exemple`, `exemple.fr`). Journal : 5 lignes, commence par `# Journal L08-T37`. La branche se fusionne sur main sans conflit.
- `commun-personnes.test.ts` : 18 sur 18 en local (Node 24). CI : `tests`, `types`, `lint`, `gardes`, `gitleaks` verts (run 43083754794).
- Défauts de l'avis précédent, vérifiés par mutation à la main (puis annulée) :
  - 1a (test L08-T34) : corrigé par #1016, `tests` vert.
  - 3 (`sans-reglage-503` faux serveur) : **corrigé**. 503 remplacé par 500 dans `faux-serveur/src/domaines/personnes.ts` → `sans-reglage-503 (faux serveur)` rougit. Même mutation côté serveur (`apps/serveur/src/domaines/personnes.ts`) → rougit côté serveur.
  - 4 (clé d'idempotence et corps non validés) : **corrigé**. Clé rendue facultative dans `entree` → `entrees-invalides-400 (faux serveur)` rougit.
  - Retrait de la traduction `ErreurPersonnes` → oRPC côté serveur → `recherche-vide-422`, `traiter-refus-sans-source-422`, `traiter-deux-fois-409` rougissent.
- Cloisonnement : un service par `creerApp` et par `handlersPersonnes`. Mutation « service partagé au niveau du module » côté faux serveur → `etat-propre-a-chaque-instance` et `entrees-invalides-400` rougissent ; même mutation côté serveur → `entrees-invalides-400 (serveur en mémoire)` rougit. L'état ne fuit pas d'une instance à l'autre.

## Défauts bloquants
1. **CI `e2e` toujours rouge (11 échecs : accessibilite ×4, pannes ×7), donc `verifier` rouge** : le critère « pnpm verifier » n'est pas tenu. Le défaut 1b n'est corrigé qu'en partie. #1016 a retiré `node:crypto` de `personnes-service.ts`, mais `creerServicePersonnes` appelle `genererRgpd` (`packages/donnees-fictives/src/rgpd.ts:3` et `:41`, `createHash` de `node:crypto`). En mode simulé, `creerHandlers` crée ce service dans le navigateur. Reproduit en local (`vite --mode simule`, `/essai`) : `PAGEERR Module "node:crypto" has been externalized… Cannot access "node:crypto.createHash"`, aucun titre affiché. Sur origin/main, la même page affiche « Écran de test ». Contre-épreuve : avec `createHash` remplacé par une fonction pure dans `rgpd.ts`, la page s'affiche. Correction : empreinte pure dans `donnees-fictives/src/rgpd.ts`, par exemple sur le modèle d'`empreintePure`. Le fichier est hors périmètre : il faut une fiche corrective décidée par Will, sans élargir cette PR.
2. **Défaut 2 traité en partie** : le test nommé `traiter-refus-sans-source-422` (`suite-personnes.ts:58-66`) exige maintenant exactement 422 `ISSUE_NON_PERMISE`, mais ne prouve toujours pas la règle « refus sans source » par HTTP. La règle est prouvée sur le service (`commun-personnes.test.ts:41-48`). Mutation : ligne `source_manquante` neutralisée dans `noyau/src/rgpd/demandes.ts:66` → `refus-gel-sans-source-source-manquante` rougit. Les options d'exploitation des deux serveurs n'exposent ni `concernes` ni `gel` (vérifié) : sans fiche corrective, la preuve sur le service est la seule possible. À Will de décider s'il l'accepte à la place du test HTTP.
3. `pilotage/fiches/L08-T37.md` reste en `statut: a_faire` : la consigne auteur demande `statut: fait` dans la PR.

## Remarques
- Au niveau du serveur, le cloisonnement entre instances n'est détecté qu'indirectement, par le compte de 6 dans `entrees-invalides-400`. Un test dédié côté serveur, comme `etat-propre-a-chaque-instance` côté faux serveur, serait plus lisible.
- Le service prend `societeId` dans le jeu fictif (`jeu.demandes[0]`) et les routes n'ont pas de contexte société : le cloisonnement repose sur une instance par société. Il faudra le revoir quand le stockage réel arrivera (fiches bloquées).
