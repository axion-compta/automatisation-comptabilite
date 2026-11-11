VERDICT: A CORRIGER
2c75454ed383990a1f69c0ebf932cb4bd3dfd86a

# Avis PR 986 (L08-T37, domaine demandes des personnes) — 2e relecture, SENSIBLE

Relu au SHA de tête ci-dessus. Fiche lue sur origin/main (`sensible: oui`, droits) : fusion par Will seul.

Depuis l'avis précédent (SHA 95df3ab), les commits ajoutés sont `478b0d2` (types, taille, journal) et deux fusions de main. Le code n'a reçu que des retouches de types et des commentaires raccourcis. Les défauts 2, 3 et 4 de l'avis précédent ne sont pas traités.

## Ce qui est tenu
- Mots interdits : « conforme », « conformité », « sans erreur », « garanti », « juriste », « PDP » sont absents des lignes ajoutées. La PR ne touche aucun écran e50 : le périmètre de la fiche ne comprend aucun écran (L08-T39 et L08-T40 sont hors périmètre).
- `fichiers_autorises` : les 5 fichiers modifiés sont dans la liste ; `handlers.ts`, `app.ts`, le contrat et `options-exploitation.ts` ne sont pas touchés.
- Taille : 241 + 19 = 260 lignes, pour un maximum de 260 (pile à la limite). Aucune ligne « - - », aucun octet NUL, pas d'alias de `it` ou de `test`.
- Journal : 8 lignes, commence par `# Journal L08-T37`. Réglages fictifs, aucun prix, aucun secret, aucun nom réel.
- Tests nommés : `commun-personnes.test.ts` passe au SHA relu (15 sur 15).

## Défauts bloquants
1. **CI rouge : `tests`, `e2e` et `verifier`** (run 43011761023). Le critère « pnpm verifier » n'est pas tenu.
   a. `tests` : `packages/faux-serveur/src/__tests__/exploitation-branchement.test.ts` (L08-T34, hors périmètre) échoue sur `cinq-routes-interceptees` et `base-appliquee` ; reproduit en local. Ce défaut est déjà signalé : il faut une fiche corrective décidée par Will.
   b. **NOUVEAU — `e2e` : 11 échecs** (accessibilite.e2e.ts ×4, pannes.e2e.ts ×7), alors que l'e2e est vert sur main (PR 1013, même base). Cause reproduite en local avec `vite --mode simule` et `/essai` : `PAGEERR Error: Module "node:crypto" has been externalized for browser compatibility. Cannot access "node:crypto.createHash" in client code`. `packages/faux-serveur/src/domaines/personnes.ts:2` importe `creerServicePersonnes` de `packages/contrat/src/domaines/personnes-service.ts`, qui importe `createHash` de `node:crypto` (ligne 1). Le faux serveur tourne aussi dans le navigateur (`apps/web/src/main.tsx:14`) : l'application en mode simulé ne démarre plus. Correction : rendre le service utilisable dans le navigateur, sans `node:crypto` (empreinte pure ou injectée en option). Cela touche `personnes-service.ts`, hors périmètre : il faut une fiche corrective (décision de Will), sans élargir cette PR.
2. **Non traité** — `suite-personnes.ts:64-73` (`traiter-refus-sans-source-422`) accepte `ISSUE_NON_PERMISE` ou `SOURCE_MANQUANTE`. Le journal (ligne 6) reconnaît que la réponse est toujours `ISSUE_NON_PERMISE` : la règle « refus sans source » n'est pas testée. Il faut exiger exactement `SOURCE_MANQUANTE` dans un cas où le refus est permis. Si les options ne le permettent pas, il faut une fiche corrective, et ce test nommé ne peut pas être compté comme tenu.
3. **Non traité** — `commun-personnes.test.ts:44` : côté faux serveur, `sans-reglage-503` rejoue en fait le serveur en mémoire (`cibleVrai(false)`). Le chemin 503 du faux serveur (`faux-serveur/src/domaines/personnes.ts:20`) n'est jamais exécuté. Il faut appeler `handlersPersonnes` avec des options sans `reglagesPersonnes` et exiger 503 `REGLAGE_ABSENT`.
4. **Non traité** — `faux-serveur/src/domaines/personnes.ts:27` : `cleDe` rend `''` quand l'en-tête `idempotency-key` manque, et les corps ne sont pas validés. Le vrai serveur refuse ces requêtes (contrat `EnTeteEcriture`) : les deux serveurs divergent. Il faut refuser comme le vrai serveur et ajouter ce cas à la suite commune. Attention : la taille est déjà à 260, il faudra compacter ou demander une marge dans une fiche.

## Remarques
- Le corps de la PR ne signale ni le blocage, ni les échecs de CI ; le journal, lui, le fait.
