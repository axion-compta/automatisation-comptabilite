VERDICT: OK
SHA relu : 73d86d46babcb2fb9d009de25c2ac6bd1dac4093
PR 910, branche pilotage/L15-T59-deblocage, fiche L15-T59 (sensible), relue après correction.

## Ce qui est correct
- Diff : un seul fichier, `pilotage/fiches/L15-T59.md` (15 ajouts, 9 retraits).
- Le défaut de l'ancien avis (SHA 1a1784b) est traité. La fiche n'exige plus de vraie base :
  - aucun pilote, aucune base en CI, `nouvelles_dependances: []` ;
  - critères « aucun test ne se connecte à une base » et « aucune base » sur le test SQL ;
  - « Hors périmètre » : adaptateur PostgreSQL réel, exécution de la migration et test sur base, après J10.
- Même principe que L12-T48 (PR 872) et que L08-T45 (`depots-exploitation-rgpd.ts`, `080-exploitation-rgpd.sql` dans le dossier des migrations) :
  - un faux dépôt en mémoire qui porte les règles des tables ;
  - une migration écrite, non exécutée (ce que disent les « Pièges »), contrôlée par la garde (`analyserMigration`, `analyserNoms`, `node outils/gardes/migrations.mjs` dans les critères).
- Chemin confirmé : `apps/serveur/src/base/migrations/015-interface-transverse.sql`.
  - Le nom passe `analyserNoms`.
  - `git ls-files` liste 015 avant 080 : pas d'`ordre_inverse`.
  - Aucune autre fiche ne prend 015.
- Les règles clés restent testées contre le faux, et l'abandon du test concurrent est dit ouvertement (Contexte et Hors périmètre), pas en silence.
  - Unicité de clé active : test `unicite-alerte-active`, plus le critère « rougit si le faux dépôt laisse deux alertes actives de même clé » (mutation exigée), plus `alerte-fermee-reouvrable`. Côté SQL, l'index unique partiel `WHERE etat IN ('ouverte','reportee')` est vérifié par lecture.
  - `alerte_journal` en ajout seul : `journal-ajout-seul-update` et `journal-ajout-seul-delete`, où `modifier` et `supprimer` lèvent toujours et ne changent rien. Côté SQL, le refus de `UPDATE` et `DELETE` est vérifié par lecture. Le motif `DELETE FROM` de la garde ne gêne pas un déclencheur `BEFORE UPDATE OR DELETE`.
  - Les autres règles restent aussi : isolation par société venue du contexte, compteur tout ou rien, montants (NaN, Infinity, non entier), copies, exceptions « par personne ».
- Déblocage : D42 et D29 (09/11/2026) cités, avec J3a (07/11/2026) et ses quatre conditions. Même texte que L11-T38 (#909). Dépendance L15-T46 : `fait`.
- Le point 6 reprend la règle 13 de `CONSIGNE-AUTEUR3.md`, y compris « aucun accès direct à la base ou aux fichiers de la console ». Le point 7 demande le journal en 10 lignes au plus.
- `node outils/gardes/fiches.mjs` : 891 fiches cohérentes, 336 avertissements, les mêmes que sur main, aucun sur L15-T59.
- Aucun mot interdit, aucun prix.

## Remarques (non bloquantes)
- `pilotage/fiches/L15-T59.md:14` : `taille_max_lignes: 380` paraît juste. L08-T45 fait 284 lignes pour 4 tables et 1 dépôt. Ici, il y a environ 14 tables, 8 interfaces et 9 tests nommés. Si l'auteur dépasse, il doit bloquer la fiche (échec visible) et non alléger les interfaces ou les tests. Une découpe en deux fiches (alertes, journal et compteur d'un côté, le reste de l'autre) serait plus sûre.
- Le numéro 015 est inférieur à 080, déjà sur main. La garde l'accepte, mais un exécuteur de migrations qui refuse un numéro plus petit que le dernier appliqué le rejetterait le jour où la base réelle sera branchée. À revoir à ce moment-là (hors de cette PR).
- Hors périmètre de cette PR : L15-T64 vise `015b-index-recherche.sql`, que `analyserNoms` refuse (`nom_invalide`). À corriger avant de débloquer L15-T64.
