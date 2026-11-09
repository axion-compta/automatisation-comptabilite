VERDICT: A CORRIGER
SHA relu : 2cf379efc771d11c64925472b517b4e067b2313a

# Avis de relecture, PR 944 (fiche L08-T35), branche lot-08/L08-T35

## Défaut bloquant
1. **Le faux serveur lit maintenant `node:fs` au démarrage, ce qui casse 17 fichiers de test de `apps/web` et le mode simulé du navigateur.**
   `packages/faux-serveur/src/domaines/sante.ts:3` importe `versionDuServeur` depuis `apps/serveur/src/domaines/sante-exploitation.ts`, et `sante.ts:23` l'appelle dans `handlersSante`. Cette fonction fait `readFileSync(new URL('../../package.json', import.meta.url))`. Or `creerHandlers` appelle `handlersSante` (`handlers.ts:173`), et `creerHandlers` sert partout :
   - **Tests jsdom** : `demarrerNoeud()` lève `TypeError: The URL must be of scheme file`, car sous jsdom `import.meta.url` n'est pas en `file:`. `node scripts/verifier.mjs` est rouge à l'étape `tests` : 17 fichiers et 33 tests en échec (dont `socle/__tests__/un-seul-main.test.tsx`, `ecrans/e12/__tests__/e12.test.tsx`, `ecrans/e19`, `e44`, `e45`, `e56`, `e57`, `n03`, `n04`, `t05`, `donnees/__tests__/preferences.test.tsx`, `chat/__tests__/discussion.test.tsx`). Sur `origin/main`, `un-seul-main.test.tsx` passe (16 sur 16) ; sur cette branche, ses 16 tests sont sautés après l'erreur.
   - **Navigateur** (`vite --mode simule` dans `apps/web`, comme le script `dev:simule`, essayé avec Chromium) : erreur `Module "node:fs" has been externalized for browser compatibility. Cannot access "node:fs.readFileSync"`, et la racine reste vide, donc l'application ne s'affiche plus. Sur `origin/main`, la même sonde affiche l'application (le `GET /sante` y répond 501). `domaines/preferences.ts:11` évite déjà ce piège avec un import différé, pour la même raison.
   Le critère « pnpm verifier » de la fiche n'est donc pas rempli.
   **Correction demandée** (dans les fichiers autorisés) : ne pas lire `package.json` depuis le faux serveur au chargement des gestionnaires. Par exemple, passer la version en option (`OptionsExploitationFaux`, ou une valeur fictive par défaut), et la lire avec `versionDuServeur()` seulement côté Node, dans `commun-sante.test.ts`, pour que `meme-reponse-des-deux-serveurs` compare toujours les mêmes versions. Autre possibilité : un import différé, comme dans `preferences.ts`, protégé hors de Node. Vérifier ensuite que `node scripts/verifier.mjs` est vert en entier et que `dev:simule` affiche l'application.

## Contrôles faits
- Fichiers modifiés : les 8 font partie des `fichiers_autorises`. `handlers.ts`, `app.ts`, le contrat, `sante-service.ts` et `routesSante` ne sont pas touchés. Aucune dépendance n'est ajoutée.
- Taille : 167 lignes ajoutées et 10 supprimées, soit 177 pour 220 au plus (aucune ligne « - - »).
- Tests ciblés : `sante-exploitation-service.test.ts` et `commun-sante.test.ts` passent en entier (11 sur 11). Les 6 tests nommés sont présents.
- Mutations, toutes annulées ensuite :
  - causes renvoyées en plus des trois champs → 7 tests rougissent ;
  - `x-panne-sante: degrade` sans effet → `faux-serveur-panne-simulee` rougit ;
  - version recopiée en dur dans le faux serveur → `meme-reponse-des-deux-serveurs` rougit ;
  - options de vérification ignorées → `migration-en-retard-degrade` et `faux-serveur-panne-simulee` rougissent.
- Règle 13 (CONSIGNE-AUTEUR3) : aucun nom d'hôte, de base ni de client dans la réponse. L'empreinte d'image par défaut est fictive. Le domaine `exemple.fr` des tests est fictif.
- Journal : 6 lignes, il commence par `# Journal L08-T35`. Aucun prix ni mot interdit.
