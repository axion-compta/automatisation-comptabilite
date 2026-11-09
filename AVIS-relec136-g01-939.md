VERDICT: OK
SHA relu : 458abcb9e6b70978fab208427dff9831bdd5e4f6

# Avis de relecture, PR 939 (fiche L09-T48, sensible), branche lot-09/L09-T48

## Défauts de l'ancien avis (relec134, SHA 27f7e34)
1. Lint rouge (import inutilisé `ErreurDepotProfil`) : corrigé. `depot-profil.test.ts:28` s'en sert maintenant : `toThrow(ErreurDepotProfil)`. Check-runs du SHA relu : les 9 jobs sont verts (lint, types, tests, gardes, verifier, stryker, e2e, gitleaks, licences).
2. `DROP TRIGGER` dans `090-profil.sql` : corrigé. Les deux déclencheurs sont écrits `CREATE OR REPLACE TRIGGER … BEFORE UPDATE OR DELETE`, et il ne reste aucun DROP. `090-profil.test.ts` contrôle maintenant `CREATE OR REPLACE TRIGGER` et `not.toMatch(/\bDROP\b/i)`.

## Rien d'autre n'a changé
Entre 27f7e34 et 458abcb, les fichiers de la PR ne changent que sur ces deux points (+1 ligne de test, motif du déclencheur, assertion DROP, 2 DROP retirés). Le reste du delta vient de la fusion de main (015-interface-transverse, etc.), pas de la PR.

## Contrôles
- Fichiers : les 6 `fichiers_autorises` seulement, sans `.github/`, sans garde et sans dépendance.
- Taille : 387 lignes (47+121+129+83+1+6) pour 390 au plus. Aucune ligne « - - ».
- Tests : 12 sur 12 passent (`depot-profil.test.ts`, `090-profil.test.ts`). `node outils/gardes/migrations.mjs` est vert. Aucun test ne se connecte à une base.
- Mutations, annulées ensuite :
  - un `DROP TRIGGER` remis dans le SQL → le test des déclencheurs rougit ;
  - `BEFORE UPDATE OR DELETE` réduit à `BEFORE UPDATE` → le même test rougit ;
  - le refus `ajout_seul` levé avec une autre classe d'erreur → `ajout-seul-modifier-refuse` rougit.
- Règle 13 : interfaces et dépôt en mémoire. Aucune adresse, machine, port, identifiant ni secret. Rien en production.
- Aucun mot interdit, aucun prix, données fictives. Journal : 6 lignes, il commence par `# Journal L09-T48`.

## Remarques (non bloquantes)
- Les remarques de l'ancien avis restent valables : `confirmePar` n'est pas conservé (`depot-profil.ts:79`), `lecture: unknown`, le code `centimes_invalides` sert pour un effectif, et l'URL d'exemple est sur un domaine public réel (`depot-profil.test.ts:18`).

Fiche sensible : la fusion revient à Will seul.
