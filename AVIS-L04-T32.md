VERDICT: OK

# Avis L04-T32 (PR #1036), deuxième relecture

SHA relu : c4c2573819de3d3f3db2af1d594e0dcc863d7022 (branche `lot-04/L04-T32`). Cette relecture suit l'avis A CORRIGER du SHA 80c7ac6899a343fa610851b0c9f822d3def5e342 (commentaire de la PR).

## Défaut de l'avis précédent : corrigé et vérifié par mutation
Défaut : la règle Idempotency-Key n'était pas testée, et une clé réutilisée avec d'autres fichiers les perdait sans le dire.
- Correction : `packages/contrat/src/domaines/depot-service.ts:34-40` indexe désormais le rejeu par la clé et les empreintes SHA-256 de tous les fichiers. Même clé et mêmes octets donnent la même réponse, sans nouveau stockage. Même clé avec d'autres octets : les fichiers sont traités et stockés.
- Deux tests ajoutés dans `packages/contrat/src/__tests__/depot.test.ts` : `meme-cle-meme-reponse` et `meme-cle-autres-fichiers-stockes`.

Mutations, toutes annulées ensuite :

| Mutation | Résultat |
| --- | --- |
| retour du rejeu supprimé (`if (deja !== undefined) return deja;`) | rouge (`meme-cle-meme-reponse`) |
| rejeu indexé par la clé seule (ancien défaut) | rouge (`meme-cle-autres-fichiers-stockes`) |
| rejeu indexé par les empreintes seules, sans la clé | rouge (`meme-fichier-deja-recue`) |
| `rejeux.set` supprimé | rouge (`meme-cle-meme-reponse`) |
| doublon d'empreinte ignoré | rouge |
| relance sans contrôle d'état `en_erreur` | rouge |
| limite de taille ignorée | rouge |
| refus de type ignoré | rouge |

## Contrôles relancés
- Périmètre : les 13 fichiers modifiés sont tous dans `fichiers_autorises` de la fiche sur `origin/main`. Aucune ligne « - - ».
- Taille : 298 lignes hors fragment généré `openapi/lot-04/openapi.json` (plafond : 300). Le fragment fait 133 lignes de plus.
- Tests ciblés (`depot.test.ts` contrat et serveur, `pieces-branchement.test.ts`) : 13/13 au vert. Les 8 tests nommés de la fiche sont présents.
- Suites complètes contrat et serveur : 210 fichiers, 1568 tests au vert.
- `node packages/contrat/scripts/openapi.mjs` régénère sans aucun écart. `routesEcritureSansEnTete()` reste `[]` (testé).
- `tsc --noEmit` (contrat, serveur) et eslint sont propres sur les fichiers touchés. La CI au SHA relu est entièrement verte (verifier, gardes, tests, types, lint, gitleaks, licences, stryker, e2e).
- Aucun mot interdit, aucun prix, aucun secret ; octets fabriqués dans les tests. Le journal fait 7 lignes et commence par `# Journal L04-T32`.

## Remarques (non bloquantes)
- `pilotage/journal/L04-T32.md:6` : deux puces sont collées sur une même ligne (« … (autorisé par #1025). - Fiche de la branche … »). À séparer.
- Les remarques non bloquantes de l'avis précédent sont notées « hors périmètre, à reprendre » au journal, sans fiche nommée. Il s'agit de la date des réglages, figée à la création du routeur (`apps/serveur/src/domaines/depot.ts`), et du réglage `pieces_reelles_autorisees`, qui n'est pas lu. Il faudra une fiche de suite.
- Cas limites toujours non testés : fichier de 0 octet, liste `fichiers` vide, plus de 20 fichiers.
- Taille totale avec le fragment OpenAPI généré : 431 lignes. Comptée comme à la première relecture (fragment généré à part) ; à confirmer par Will.

Fiche sensible (entrée de fichiers) : fusion par Will seul.
