VERDICT: A CORRIGER
SHA relu : d0757d09a11f283e2be0932caa8c5f675d7ba75d
PR 906, branche pilotage/L09-T48-deblocage, fiche L09-T48 (sensible), relue après correction.

## Ce qui est correct
- Diff : un seul fichier, `pilotage/fiches/L09-T48.md` (6 ajouts, 5 retraits). L'en-tête ne change que sur `fichiers_autorises`.
- Les réserves de l'ancien avis sont traitées :
  - chemins réels : `apps/serveur/src/base/migrations/090-profil.sql` (dossier `DOSSIER` de `outils/gardes/migrations.mjs`, nom au format NNN-nom.sql, numéro 090 pris par aucune autre fiche, après 080, donc pas d'`ordre_inverse`), `apps/serveur/src/base/depot-profil.ts` et `apps/serveur/src/base/__tests__/depot-profil.test.ts` ;
  - l'origine des tables `societe`, `regime_tva_societe` et `parametre_date` est donnée : elles sont créées dans la base de la compta avec `IF NOT EXISTS`, rien n'est créé dans un schéma de la console.
- Déblocage : D42 et D29 (09/11/2026) cités, avec le rappel de J3a (07/11/2026) et de ses quatre conditions. Même texte que L11-T38 (#909), déjà sur main.
- Le point 4 reprend la règle 13 de `CONSIGNE-AUTEUR3.md`.
- Dépendances L09-T03, T08, T11, T17 et T23 : toutes `fait`.
- `node outils/gardes/fiches.mjs` : 891 fiches cohérentes, 336 avertissements, les mêmes que sur main, aucun sur L09-T48.
- Aucun mot interdit, aucun prix.

## Défaut (risque réel)
1. `pilotage/fiches/L09-T48.md:16`, `:25` et `:27` : la fiche est débloquée, mais elle exige toujours une vraie base PostgreSQL. C'est le défaut corrigé sur L15-T59 (PR 910) :
   - critère « migration appliquée deux fois avec le même résultat » et test `migration-deux-fois` ;
   - `ajout-seul-update-refuse` : l'ajout seul est fait « par droits » au rôle applicatif ;
   - `chevauchement-refuse-par-la-base` : contrainte d'exclusion.

   Or le dépôt n'a aucun pilote PostgreSQL (rien dans `pnpm-lock.yaml`) et la CI (`.github/workflows/ci.yml`) n'a pas de base. `nouvelles_dependances: []` interdit d'en ajouter. J3a et la règle 13 imposent interface et faux service, et interdisent tout identifiant de base, alors qu'un `REVOKE` au « rôle applicatif » demande un nom de rôle.

   L'auteur ne peut donc pas remplir les critères sans enfreindre une règle. Il pourrait aussi les affaiblir en silence : un test nommé « refusé par la base » qui ne teste qu'un objet.

   Correction demandée : réécrire les points 1 à 3 et `criteres` sur le modèle de L08-T45 / L15-T59 corrigée.
   - Le dépôt `depot-profil.ts` devient une interface avec un adaptateur en mémoire (`creer…Memoire({ nouvelId })`). Ce faux porte les règles : ajout seul de `champ_profil` et `parametre_lecture` (modifier et supprimer lèvent toujours), refus du chevauchement des périodes, `confirme_par` exigé quand `statut = confirme`, centimes entiers (refus de NaN, Infinity et non entier), isolation par société venue du contexte, copies rendues.
   - Les tests sont renommés pour ne plus promettre un refus « par la base ». Au moins un critère dit que le test du chevauchement rougit si le faux l'accepte.
   - Un test lit `090-profil.sql` (`readFileSync`) et le passe à `analyserMigration` et `analyserNoms`. Il vérifie `IF NOT EXISTS` partout, la contrainte d'exclusion, le `CHECK` sur `confirme_par`, `bigint`, et le refus de `UPDATE`/`DELETE` par un déclencheur plutôt que par des droits sur un rôle nommé.
   - Les critères ajoutent « aucun test ne se connecte à une base » et `node outils/gardes/migrations.mjs`.
   - « Hors périmètre » ajoute l'adaptateur PostgreSQL réel et l'exécution de la migration (après J10).
   - Vérifier que `taille_max_lignes: 300` suffit, sinon la relever, sans dépasser 400.

## Remarques (non bloquantes)
- Point 4 (`:28`) : il manque la phrase « Aucun accès direct à la base ou aux fichiers de la console » de la règle 13. L15-T59 corrigée l'écrit, pas celle-ci : l'interdiction n'est qu'implicite. À ajouter dans la même correction.
- Le contexte ne dit pas dans quel schéma vont les tables (`a_compta` comme 080 ?). À préciser pour éviter une seconde correction.
