VERDICT: A CORRIGER

# Avis L15-T64 (PR #1043, fiche SENSIBLE)

SHA relu : b380cbf7874aa5b79c005fa88341baad1425535d (tête de `lot-15/L15-T64`).
Fiche de référence : `origin/lot-00/L00-T83:pilotage/fiches/L15-T64.md` (amendée par #1032, non fusionnée). Tout passe par une interface et un faux (J3a), sans vraie base.

## Contrôles
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` de la fiche amendée ; 300 lignes ajoutées sur 300 au plus ; aucune ligne « - - ».
- Journal : 7 lignes, commence par `# Journal L15-T64`.
- vitest ciblé : 14/14 verts. eslint et tsc (serveur) verts. Gardes locales vertes : migrations, fictif, textes, appels, litteraux, registre-legal, sous-traitants, tests, controles.
- CI au SHA relu : `gardes` et `verifier` sont rouges, seulement à cause de `perimetre` (« fichier hors liste : 093-index-recherche.sql »). La cause est la fiche de main, pas encore amendée par #1032 ; ce n'est pas compté comme défaut.
- Requêtes SQL toutes paramétrées ; texte cherché réduit aux lettres et chiffres avant `to_tsquery` ; aucune journalisation du texte.
- Aucun prix, aucun mot interdit, données fictives.

## Mutations (10)
- Rouges : isolation retirée dans le dépôt en mémoire, retrait en mémoire neutralisé, permissions ignorées, gabarit non nettoyé, valeur concaténée dans `SQL.retirer`, retrait SQL différé par `setTimeout`.
- M3 `await port.executer` changé en `void port.executer` dans `retirer` (SQL) : VERT, la mutation survit.
- M8 `societe_id = $1` retiré du `WHERE` de `SQL.chercher` : VERT, la mutation survit.
- M7 `every` changé en `some` (ET devenu OU) dans le dépôt en mémoire : VERT, la mutation survit.
- M9 limite par défaut 10 changée en 10000 : VERT, la mutation survit.

## Défauts
1. `apps/serveur/src/domaines/recherche-base.ts:32` (`SQL.chercher`) : l'isolation par société du dépôt SQL n'est pas testée. Une requête sans `societe_id = $1` passe tous les tests (M8). Correction : dans le test du port, vérifier que chaque gabarit de lecture, d'écriture et de suppression filtre par `societe_id = $1` et que `params[0]` vaut la société appelante.
2. `apps/serveur/src/__tests__/recherche-base.test.ts:82` : le test « le retrait SQL est attendu avant de rendre la main » ne détecte pas l'absence d'`await` (M3). C'est pourtant le critère « pièce marquée sensible retirée avant la réponse suivante ». Correction : un port dont `executer` ne se résout qu'à la demande (promesse contrôlée par le test), puis vérifier que `retirer` reste en attente tant que cette promesse n'est pas résolue.
3. `apps/serveur/src/domaines/recherche-base.ts:50`, `:73` et `:97` : le caractère « sensible » n'existe pas dans le dépôt. `EntreeBase` n'a aucun marqueur, et `indexer` comme `reconstruire` indexent une pièce sensible sans la refuser : une reconstruction ou le contrôle quotidien peut donc la remettre dans l'index. L15-T37 l'excluait à la construction (S3 : exclue, pas masquée). Correction : ajouter `sensible` à l'entrée, puis faire en sorte qu'`indexer` retire la ligne au lieu de l'écrire quand `sensible` est vrai, dans les deux dépôts. Ajouter deux tests : « reconstruction n'indexe pas une pièce sensible » et « une ré-indexation marquée sensible retire la ligne ».
4. `apps/serveur/src/domaines/recherche-base.ts:16` : la fiche (À faire 1) demande un dépôt « qui remplace le service en mémoire de L15-T37 derrière la même interface ». Or `DepotRecherche` est une interface nouvelle, et rien n'expose la forme `ServiceRecherche` (`chercher(corps) → ReponseService`) qu'attend `apps/serveur/src/domaines/recherche.ts`. Correction : fournir dans `recherche-base.ts` un adaptateur qui produit cette forme (résultat `{ type, id, titre, extrait, lien, date, exerciceId, score }`, `mot: 'rien_trouve'`, `requete_invalide`), avec un test. Si la taille de la PR ne le permet pas, le noter dans le journal et demander une fiche de suite.
5. `apps/serveur/src/domaines/recherche-base.ts:57` et `:91` : `f.limite` n'est pas validée. NaN donne une liste vide en mémoire et un `LIMIT` invalide en SQL ; une valeur négative fait que `slice(0, -1)` retire le dernier résultat ; une valeur non entière ou `Infinity` n'est pas refusée. La consigne exige les cas limites NaN, Infinity, non entiers et vides. Correction : borner avec `BORNES_LIMITE` du contrat, refuser ou ramener au défaut, et tester ces cas ainsi que la limite par défaut (M9).

## Remarques (non bloquantes)
- La fiche cite `websearch_to_tsquery`, mais la PR utilise `to_tsquery` sur un gabarit nettoyé, pour gérer le préfixe du dernier mot. Le choix se défend ; il faut le noter dans le journal.
- M7 : la sémantique ET du dépôt en mémoire n'est pas distinguée de OU par les tests. Elle diffère aussi du service de L15-T37 (OU pondéré). Ajouter un test à deux mots dont un seul est présent.
- Migration : `public.unaccent` suppose que l'extension vit dans `public`. Il vaut mieux écrire `CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public`.
- Le gabarit retire l'apostrophe sans séparer les mots (« l'atelier » devient « latelier »), ce qui ne correspond plus au découpage de `to_tsvector`. Le séparer en espace serait plus juste.
