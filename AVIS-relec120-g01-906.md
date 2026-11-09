VERDICT: OK
SHA relu : 047a7fdd3d75d87b8d959941168c6636fcf06663
PR 906, branche pilotage/L09-T48-deblocage, fiche L09-T48 (sensible), relue après la seconde correction (avis relec118-g01-906).

## Ce qui est correct
- Diff : un seul fichier, `pilotage/fiches/L09-T48.md` (16 ajouts, 12 retraits), aucune ligne « - - ».
- Le défaut bloquant de relec118 est traité, sur le modèle de L15-T59 fusionnée :
  - plus de vraie base PostgreSQL : le critère « migration appliquée deux fois » disparaît, ainsi que les tests `migration-deux-fois`, `ajout-seul-update-refuse` (par droits) et `chevauchement-refuse-par-la-base` ;
  - point 2 : interface et adaptateur en mémoire `creerDepotProfilMemoire({ nouvelId })` ;
  - point 3 : `apps/serveur/src/base/migrations/090-profil.sql` est dans le `DOSSIER` de `garde:migrations`. La migration est écrite et non exécutée. Le refus de UPDATE et DELETE passe par un déclencheur, sans rôle nommé ;
  - point 5 : le test `090-profil.test.ts` lit le SQL avec `readFileSync` et appelle `analyserMigration` et `analyserNoms` ;
  - critères : « aucun test ne se connecte à une base », `node outils/gardes/migrations.mjs` ; `nouvelles_dependances: []` ;
  - « Hors périmètre » ajoute l'adaptateur réel, l'exécution, les droits par rôle et les tests sur base, après J10.
- Les garanties restent testées contre le faux, sans être affaiblies :
  - l'ajout seul a deux tests, `ajout-seul-modifier-refuse` et `ajout-seul-supprimer-refuse` (« rien ne change ») ;
  - `chevauchement-refuse` doit rougir si le faux accepte un recouvrement ;
  - `confirme-sans-personne-refuse` ;
  - `centimes-entiers` refuse NaN, Infinity et les non-entiers ;
  - `societe-voisine-invisible`, avec la société prise dans le contexte ;
  - `copie-non-modifiable` ;
  - côté SQL : contrainte d'exclusion, `CHECK` sur `confirme_par`, `bigint` et déclencheur.
  Les Pièges interdisent de prétendre à un refus « par la base ».
- Les remarques de relec118 sont traitées :
  - la phrase « Aucun accès direct à la base ou aux fichiers de la console » est présente (point 6, règle 13) ;
  - le schéma est précisé : `a_compta`, comme 080.
- Déblocage : D42 et D29 (09/11/2026) et J3a (07/11/2026) avec ses quatre conditions. Le journal doit citer le déblocage.
- `taille_max_lignes: 390`, sous 400. 090 est libre (aucune autre fiche) et supérieur à 080. Les quatre chemins sont dans `fichiers_autorises`.
- Le noyau visé existe : `packages/noyau/src/profil/champs.ts` (`ajouterValeur`, `valeurEnVigueur`) et `fiscal/imposition.ts` (`ajouterLigneImposition`, `impositionAuJour`). Il s'importe par chemin relatif comme ailleurs dans `apps/serveur`, sans nouvelle dépendance.
- `node outils/gardes/fiches.mjs` : 892 fiches cohérentes, comme main, aucun avertissement sur L09-T48.
- Aucun mot interdit, aucun prix, aucun octet NUL, données fictives.

## Remarques (non bloquantes)
- Points 3 et 5, « `IF NOT EXISTS` partout » : PostgreSQL n'a pas `IF NOT EXISTS` pour `CREATE FUNCTION`, `CREATE TRIGGER` ni `ADD CONSTRAINT … EXCLUDE`. L'auteur devra :
  - écrire `CREATE OR REPLACE FUNCTION` et `CREATE OR REPLACE TRIGGER` ;
  - mettre l'exclusion dans le `CREATE TABLE` ;
  - ajouter `CREATE EXTENSION IF NOT EXISTS btree_gist`, que demande `societe_id WITH =` dans un `EXCLUDE USING gist`.
  À lire comme « rejouable ». Le relecteur de l'implémentation doit vérifier que le test ne s'affaiblit pas sur ces ordres.
