VERDICT: OK
SHA relu : 582d4e7e0697a78e7dd209bcc277bb6caceb50f2

PR 989, fiche L07-T42 (sensible). Deuxième relecture Opus du 11/11/2026, après la correction de l'avis précédent (SHA dd424dd → 582d4e7).

Périmètre : 6 fichiers, tous dans `fichiers_autorises` ; 254 lignes (plafond 300). 24 tests verts en local (vitest), tsc et eslint propres. CI de ce SHA entièrement verte (verifier, types, lint, tests, gardes, gitleaks, stryker, e2e, licences). Mots interdits, prix, secrets : rien trouvé. Données fictives. Journal : 6 lignes.

## Défauts bloquants de l'avis précédent : corrigés
1. Verrou des dix `creerEspace` simultanés : `creerBase` et `appliquerMigrations` du faux service sont maintenant asynchrones et comptent leurs appels ; le test attend `{ creerBase: 1, appliquerMigrations: 1 }`. Mutations faites à la main : verrou retiré (`verrous.get(id) ?? Promise.resolve()` → `Promise.resolve()`) et `verrous.set(...)` supprimé → `dix-creations-simultanees-une-seule-base` rouge dans les deux cas.
2. `memoire.ts:36` (`if (true) bases.set(nom, 0)`) : tué par l'ajout de `verifierEtat` après le second `creerBase` (`migrations-appliquees-deux-fois-aucun-changement` rouge).
3. `memoire.ts:63/64` (désormais lignes 71/72) : `if (true) statuts.set(...)` et `if (true) {` tués par le nouveau test `rejeu-apres-creation-reussie-ne-refait-rien` (compteur d'appels inchangé, état `pret`).

## Recherche de régressions
- Autres mutations à la main : suppression de `statuts.set(..., 'pret')`, panne jamais consommée, compteurs d'appels supprimés → toutes tuées.
- Stryker sur `memoire.ts` : 60 mutants, 60 tués, score 100 %.
- Survivants manuels équivalents, sans effet observable : `.then(travail, travail)` → `.then(travail)` (la file stockée est déjà `suite.catch(...)`, elle ne rejette jamais) ; retrait du `await Promise.resolve()` de `creerBase` (le verrou sérialise déjà, et `appliquerMigrations` reste asynchrone).
- La limite connue (rejeu avec une autre clé après une panne) est maintenant documentée dans `port.ts`. Réglages fictifs commentés dans `memoire.ts`.

## Remarques (non bloquantes)
- `mise-en-service.test.ts:34` : la regex anti-import de `apps/` ne couvre toujours que les chemins relatifs.
- Stryker en CI ne mute que `src/argent/**` : le critère « stryker >= 80 » reste vérifié à la main (100 % sur memoire.ts en local).
- `pnpm verifier` non lancé en local par l'auteur (Node 22) ; la tâche CI `verifier` de ce SHA est verte.
