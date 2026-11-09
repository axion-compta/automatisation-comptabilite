VERDICT: OK
SHA relu: 7a087ccb438cb2fccbc5ee540f238a5ea4b3251c

# Avis relec126-g01-934 : PR 934 (fiche L11-T37, sensible), branche pilotage/L11-T37-chemin

Le SHA de tête renvoyé par l'API (`7a087ccb438cb2fccbc5ee540f238a5ea4b3251c`) diffère du SHA donné dans la consigne après « 7a087ccb438cb2f ». L'avis porte sur le SHA réel de tête.

## Vérifications
- Un seul fichier modifié : `pilotage/fiches/L11-T37.md` (+5 / -5, aucune ligne « - - »).
- `fichiers_autorises` : `apps/serveur/src/base/migrations/011-frais.sql` et `apps/serveur/src/base/__tests__/011-frais.test.ts`. Le dossier est bien `DOSSIER` de `outils/gardes/migrations.mjs:7`. Le nom suit `^\d{3}-[a-z0-9-]+\.sql$` (`analyserNoms`).
- Étapes 1 et 2 et critères cohérents avec ce chemin : `garde:migrations` est citée et `node outils/gardes/migrations.mjs` figure dans les critères.
- Numéro 011 libre : origin/main ne contient que 057, 080 et 081, et aucune autre fiche ne cite `011-`. Les fiches a_faire utilisent 015, 015b, 0601 et 090. L'ordre lexical (011 < 015 < 057…) ne déclenche pas `ordre_inverse`.
- `node outils/gardes/fiches.mjs` : vert (892 fiches cohérentes ; les avertissements « REPRENDRE.md » existaient déjà). `node outils/gardes/migrations.mjs` : vert.
- Aucun mot interdit et aucun prix dans le diff.

## Remarques (non bloquantes)
- La PR fait plus qu'un changement de chemin : elle retire l'exigence d'un vrai PostgreSQL (« base de test vide », « migration appliquée deux fois »). Les 8 tests se feront donc par lecture du texte SQL. Les invariants (CHECK, index unique partiel) ne seront plus exercés en base. Ce choix suit le précédent L15-T59, la condition J3a et la règle « aucune base ». Il est expliqué dans « Pièges ». Prévoir l'essai réel en base dans la fiche de branchement.
- Étape 2 : la mention « règle 13 » ne renvoie à aucune règle identifiable dans `pilotage/consignes/`. Préciser la source lors d'une prochaine retouche.
