VERDICT: A CORRIGER
SHA relu : 27f7e3420dad1da154d07af2f8de93508c2aa8fb

# Avis de relecture, PR 939 (fiche L09-T48, sensible), branche lot-09/L09-T48

## Défauts bloquants
1. **CI rouge : lint, donc verifier aussi.** Vérifié par les check-runs du SHA relu : `lint` et `verifier` en échec, les autres jobs au vert. Cause : `apps/serveur/src/base/__tests__/depot-profil.test.ts:3:10` : `'ErreurDepotProfil' is defined but never used` (@typescript-eslint/no-unused-vars). `verifier` échoue seulement parce que `lint` échoue. Le critère « pnpm verifier » de la fiche n'est donc pas rempli. Correction : retirer `ErreurDepotProfil` de l'import, ou s'en servir dans une assertion (par exemple `toBeInstanceOf(ErreurDepotProfil)` dans le helper `code`).
2. **La migration contient des DROP, alors que la fiche les interdit.** `apps/serveur/src/base/migrations/090-profil.sql:81` et `:84` : `DROP TRIGGER IF EXISTS …`. La fiche, au point 3 de « À faire », dit : « Aucun DROP, RENAME, TRUNCATE ni DELETE ». La garde ne voit pas ces lignes : elle ne cherche que DROP TABLE, COLUMN, SCHEMA et INDEX. Le test `090-profil.test.ts:22` ne les voit pas non plus, car son motif ne vise que `DROP\s+TABLE|DROP\s+COLUMN`. Risque réel : si la migration est rejouée hors transaction, `champ_profil` et `parametre_lecture` restent un moment sans le déclencheur d'ajout seul. Correction : écrire `CREATE OR REPLACE TRIGGER … BEFORE UPDATE OR DELETE ON …`, comme le fait déjà `015-interface-transverse.sql:13` sur main, et supprimer les deux `DROP TRIGGER`. Ajouter aussi dans `090-profil.test.ts` une assertion `expect(code).not.toMatch(/\bDROP\b/i)` et adapter le motif du test des déclencheurs (`CREATE OR REPLACE TRIGGER`).

## Contrôles faits
- Fichiers modifiés : les 6 font partie des `fichiers_autorises`. Aucun fichier de `.github/` ni de garde n'est touché, et aucune dépendance n'est ajoutée.
- Taille : 388 lignes ajoutées et 1 supprimée, pour 390 au plus (`git diff --numstat`, aucune ligne « - - »). La marge est très faible : les corrections doivent rester dans la limite. Le correctif 1 retire de la matière et le correctif 2 remplace des lignes.
- Tests : `vitest` sur `apps/serveur/src/base/__tests__/`, 21 tests sur 21 passent. Les 8 tests nommés de la fiche sont présents. `node outils/gardes/migrations.mjs` est vert. Aucun test ne se connecte à une base.
- Mutations, toutes annulées ensuite. Chacune fait rougir le test attendu :
  - `champs.modifier` qui ne lève plus d'erreur → `ajout-seul-modifier-refuse` rougit ;
  - `lectures.modifier` qui ne lève plus d'erreur → `ajout-seul-modifier-refuse` rougit ;
  - `champs.supprimer` qui ne lève plus d'erreur → `ajout-seul-supprimer-refuse` rougit ;
  - ajout direct d'une période sans passer par `ajouterLigneImposition` → `chevauchement-refuse` rougit ;
  - erreur `chevauchement` avalée en silence → `chevauchement-refuse` rougit ;
  - dans le SQL, `WITH &&` remplacé par `WITH =` → le test de la contrainte d'exclusion rougit.
- Migration : tout est en `IF NOT EXISTS`, les tables sont dans `a_compta`, les montants en `bigint`, la contrainte d'exclusion et les `CHECK` sur `confirme_par` sont présents. Aucun RENAME, TRUNCATE, DELETE ni GRANT, et aucun rôle nommé. Seul défaut : le point 2 ci-dessus.
- Journal : 6 lignes. Il commence par `# Journal L09-T48` et cite D42, D29 et J3a.
- Mots interdits : aucun. Prix : aucun. Données : fictives, sans adresse ni secret de serveur ou de base.

## Remarques (non bloquantes)
- `depot-profil.ts:79` : `imposition.ajouter` vérifie `confirmePar` mais ne le conserve pas dans la ligne. Ce que le dépôt rend en lecture perd l'information que la colonne `confirme_par` du SQL porte.
- `depot-profil.ts:34` : `DepotLecturesParametre.ajouter` reçoit `lecture: unknown`. Un type `Lecture` d'entrée serait plus sûr.
- `depot-profil.ts:98` : un `effectifMoyen` non entier lève `centimes_invalides`. Ce code est trompeur pour un effectif.
- `depot-profil.test.ts:18` : l'URL d'exemple utilise un vrai domaine public, avec un chemin fictif. C'est acceptable, mais un domaine en `exemple.fr` serait plus prudent.

Fiche sensible : la fusion revient à Will seul.
