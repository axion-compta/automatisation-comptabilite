VERDICT: A CORRIGER
SHA relu : dd424dd332c91759c64053c3ac9ddff17aa5dea1

PR 989, fiche L07-T42 (sensible). Relecture Opus du 11/11/2026.

Périmètre : 6 fichiers, tous dans `fichiers_autorises` ; 228 lignes (plafond 300). 23 tests verts en local (vitest), tsc et eslint propres. Mots interdits, prix, secrets : rien trouvé. Données fictives.

## Défauts bloquants
1. Critère « dix appels `creerEspace` simultanés donnent une seule base (verrou par organisation) » : aucun test ne vérifie le verrou. Mutation faite à la main dans `packages/noyau/src/mise-en-service/memoire.ts:50` (`verrous.get(id) ?? Promise.resolve()` remplacé par `Promise.resolve()`, donc plus aucun verrou) : 23/23 tests toujours verts. Stryker (lancé sur memoire.ts et port.ts) confirme : le mutant `memoire.ts:51` (suppression de `verrous.set(...)`) survit. Le faux service crée la base de façon synchrone dans une `Map`, donc « une seule base » reste vrai même sans verrou : le test ne prouve rien sur la sérialisation. Correction demandée : rendre le faux `creerBase` asynchrone (par exemple une attente sur une micro-tâche ou une promesse que le test libère) et compter les appels à `creerBase` et `appliquerMigrations` (un seul de chaque attendu pour les dix appels), ou vérifier qu'aucune réponse `rejoue` n'arrive avant la fin des migrations du premier appel. Ce test doit échouer quand le verrou est retiré.
2. `memoire.ts:36` : le mutant `if (true) bases.set(nom, 0)` survit. Un `creerBase` sur une base existante qui remettrait ses migrations à 0 n'est pas détecté. Dans `migrations-appliquees-deux-fois-aucun-changement`, après `creerBase('cli_leroy')` qui renvoie `false`, ajouter `expect(await s.bases.verifierEtat('cli_leroy')).toEqual(avant)`.
3. `memoire.ts:63` et `memoire.ts:64` : les mutants `if (true) statuts.set(..., 'en_creation')` et `if (true) {` survivent. Un rejeu sur un espace déjà `pret` le repasse en `en_creation` et relance la création de la base et les migrations sans qu'aucun test ne le voie. Ajouter un test : après une création réussie, un rejeu avec la même clé ne rappelle ni `creerBase` ni `appliquerMigrations` (compteur d'appels) et `etatEspace` reste `pret`.

## Remarques (non bloquantes)
- `memoire.ts:16` et `memoire.ts:18` : délais de fin de contrat (30, 23, [7, 14]) et `longueurMaxMotif: 200` écrits en dur comme valeurs par défaut du faux service. Ils sont injectables via `contexte`, mais il vaudrait mieux les déplacer dans le test ou les nommer comme réglages fictifs.
- Rejeu après une panne avec une AUTRE clé : `creerEspace` (L07-T41) répond `deja_existant` et l'espace reste `en_creation` pour toujours. C'est hors critère (le rejeu se fait avec la même clé), mais il faut le documenter dans le port.
- `mise-en-service.test.ts:34` : la regex anti-import de `apps/` ne couvre que les chemins relatifs (pas un import de paquet de l'espace de travail).
- Stryker en CI ne mute que `src/argent/**` : le critère « stryker >= 80 » n'est vérifié qu'à la main (92,73 % en local, mais avec les survivants listés plus haut).
- `pnpm verifier` n'a pas été lancé par l'auteur (Node 22) ; CI de ce SHA : types, lint, tests, gardes, gitleaks et stryker verts, e2e et licences encore en cours au moment de la relecture.
