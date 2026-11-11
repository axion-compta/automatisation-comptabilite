VERDICT: A CORRIGER

PR #1052 — L06-T39 — SHA de tête relu : 81eae58d60cdfd2a4eb5029f6412d38a5fa55ccb
SENSIBLE (fiche `sensible: oui`, schéma) : fusion par Will seul.

## Défaut (bloquant : critère T-CNX-7 non réellement testé)
1. apps/serveur/src/base/__tests__/migration-securite.test.ts:14-15 et :29 — `colonnes()` ne lit que le PREMIER mot de chaque ligne (`/^ {2}([a-z_]+) /`). Or la migration déclare plusieurs colonnes par ligne (ex. `nom text NOT NULL, portee text NOT NULL, reference_coffre text NOT NULL`). Les colonnes 2 et suivantes de chaque ligne ne sont jamais contrôlées par `aucun-champ-secret`.
   Preuve par mutation : remplacer `reference_coffre` par `token_api` dans `092-securite.sql`, ou ajouter `mot_de_passe text, code text,` après `role text NOT NULL,` dans `a_compta.personne` → les 6 tests restent verts.
   Correction demandée : extraire TOUTES les colonnes de chaque table (découper le corps par virgules de premier niveau, ou une colonne par ligne dans le SQL), et ajouter une vérification qui rougit sur ces deux mutations (ex. comparer `colonnes('jeton_integration')` à la liste exacte attendue, ou compter les colonnes par table).

## Vérifications passées
- Fichiers : 4, tous dans `fichiers_autorises`. Taille : 129 lignes ≤ 300. Dépendance L06-T36 : `fait`.
- Tests nommés de la fiche présents ; 6/6 verts en local ; CI entièrement verte (verifier, gardes, tests…).
- Idempotence lue sur le texte (`IF NOT EXISTS` partout, garde `migrations` vide) ; aucun `EXECUTE`, `GRANT`, `SECURITY DEFINER`, déclencheur ni `DROP` ; `action_historique` non redéfinie ; `signalement` sans clé vers les écritures ; `jeton_integration.actif` faux par défaut.
- Autres mutations détectées : clé étrangère de `signalement` rendue simple (1 rouge) ; `IF NOT EXISTS` retiré d'un index (1 rouge) ; `actif DEFAULT true` (1 rouge) ; `societe_id` sans `NOT NULL` sur `tete_journal` (1 rouge).
- Aucun mot interdit, prix, secret ni nom réel. Journal : 7 lignes, commence par `# Journal L06-T39`.

## Remarques (non bloquantes)
- Le contexte de la fiche cite l'essai d'une politique de lignes (point P5) ; il n'est pas dans « À faire » ni dans les tests nommés, donc non exigé ici.
- pilotage/journal/L06-T39.md:5 : « service d audit » → « service d'audit ».
