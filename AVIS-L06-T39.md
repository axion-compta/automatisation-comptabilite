VERDICT: A CORRIGER
SHA: ecc80e8645723e1d92991d93959e00a0a2e85975
PR: #1052

Fiche L06-T39, sensible (schéma) : fusion par Will seul. Fiche lue sur origin/main ; aucune PR de pilotage ouverte ne l'amende (PR #1075, #1076, #1077 : autres lots). `pilotage/ARRET` absent de origin/main.
Ancien avis de référence : `origin/avis/L06-T39:AVIS-L06-T39.md` (SHA relu 81eae58), identique au commentaire du 2026-11-11T20:08:42Z.

## Suivi de l'ancien avis

1. `colonnes()` ne lisait que le premier mot de chaque ligne (T-CNX-7) : **corrigé pour les deux mutations citées, mais la cause n'est que partiellement traitée** (voir Défaut 1).
   - Le corps de table est découpé par virgules de premier niveau et chaque table est comparée à `ATTENDUES` (test.ts:14-27, :47-52).
   - Mutation M1 `reference_coffre` -> `token_api` dans `092-securite.sql` : 1 rouge / 6 (`jeton_integration`). Détectée.
   - Mutation M2 ajout de `mot_de_passe text, code text,` dans `a_compta.personne` : 1 rouge / 6 (`personne`). Détectée.
   - Fichier restauré après chaque mutation ; arbre propre.
2. Remarque (journal « service d audit ») : corrigée, `pilotage/journal/L06-T39.md:5` porte « service d'audit ».

## Défauts

1. apps/serveur/src/base/__tests__/migration-securite.test.ts:27 (et :13) : `colonnes()` jette **en silence** tout élément qui ne correspond pas à `/^([a-z_]+) /` (`.filter(c !== undefined)`). Une colonne secrète peut donc encore échapper à `aucun-champ-secret (T-CNX-7)` et à la comparaison `toEqual(ATTENDUES[t])`. C'est le même défaut de fond que l'ancien avis (« extraire TOUTES les colonnes »). Mutations survivantes, toutes à 6/6 verts :
   - L1 : ajouter `token2 text,` dans `a_compta.jeton_integration` (nom contenant un chiffre) ;
   - L2 : ajouter `"Token" text,` (identifiant entre guillemets) ;
   - L3 : ajouter `-- note` puis, à la ligne suivante, `api_token text,` (commentaire collé à l'élément : `table()` lit `sql` et non `code`, l'élément commence par `--`).
   Correction demandée :
   - `table()` doit lire le texte sans commentaires (`code`, pas `sql`) ;
   - dans `colonnes()`, tout élément doit soit commencer par un mot-clé de contrainte (`PRIMARY`, `FOREIGN`, `CONSTRAINT`, `UNIQUE`, `CHECK`), soit être une colonne lue par `/^"?([A-Za-z_][A-Za-z0-9_]*)"?\s/` ; sinon le test doit échouer (lever une erreur ou `expect` explicite, jamais un filtre silencieux) ;
   - appliquer le filtre de noms secrets sans tenir compte de la casse (`/i`) ;
   - ajouter une assertion qui rougit sur L1, L2 et L3 (par exemple : nombre d'éléments par table = colonnes attendues + contraintes attendues).

## Remarques

- Vérifications passées : 4 fichiers, tous dans `fichiers_autorises` ; `--numstat` 150 ajouts / 1 retrait (≤ 300), aucune ligne « - - » ; numéro 092 libre sur main (090 et 093 présents) ; aucun mot interdit, prix, secret, adresse ni nom réel ; journal 7 lignes commençant par `# Journal L06-T39` ; import `{ describe, expect, it }` sans alias ; aucune valeur légale en dur.
- Migration : `IF NOT EXISTS` partout, aucun `EXECUTE`, `GRANT`, `SECURITY DEFINER`, déclencheur ni `DROP` ; `action_historique` non redéfinie ; clés étrangères composées avec `societe_id` ; `signalement` sans clé vers les écritures ; `jeton_integration.actif` faux par défaut. Le SQL lui-même ne pose pas de problème : seul le test est à renforcer.
- Tests locaux (Node 22, `engine_strict=false`) : `migration-securite.test.ts` 6/6 verts. Mutations libres détectées : clé étrangère de `signalement` rendue simple (1 rouge) ; `actif DEFAULT true` (1 rouge) ; `CREATE INDEX` sans `IF NOT EXISTS` (1 rouge) ; colonne `ecriture_id` dans `signalement` (2 rouges).
- `pnpm verifier` en local : toutes les gardes et les tests verts ; l'étape `types` échoue seulement pour l'environnement (pnpm refuse Node 22, le dépôt demande 24) ; `tsc --noEmit` lancé directement dans `apps/serveur` : aucune erreur. Aucune base Postgres requise (critères lus sur le texte).
- CI sur ecc80e8 : verifier, licences, gardes, lint, e2e, gitleaks, stryker, types, tests : tous en succès.
- Le contexte cite l'essai d'une politique de lignes (point P5) : absent de « À faire » et des tests nommés, donc non exigé ici.
