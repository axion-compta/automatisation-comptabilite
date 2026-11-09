VERDICT: OK
SHA relu : a57e5f37961cb800dbcf5ad3ac28a890f7faa450

Relecture stricte de la PR #822 (fiche sensible L12-T49, branche lot-12/L12-T49), après correction et fusion de main.

Défaut de l'avis précédent (93be089, un seul défaut : conflit avec main dans apps/serveur/src/app.ts)
- Corrigé par la fusion a57e5f3 (parents 93be089 et e6fffd9), sans rebase ni force-push.
- app.ts garde les deux côtés : `const profilChamps = creerServiceProfilChamps('soc-lemoine');` puis `const os = implement(contrat).$context<ContexteSession>();`, une seule fois chacun ; `profil: routesProfil(profilChamps)`, `vehiculesBareme`, `sources` venus de main sont présents ; `controlesActions: routesControlesActions(options.controlesActions)` une seule fois.
- routes.ts : import et clé `controlesActions` une seule fois chacun.
- openapi.json : régénéré par `pnpm contrat:openapi` au SHA relu, aucun écart.
- Le défaut était un conflit de fusion, pas un défaut de code : aucun test nouveau n'est attendu. Les tests de la PR rougissent toujours sur mutation (voir plus bas).

Fusion avec main : rien de perdu, rien de dupliqué
- `git diff origin/main...origin/lot-12/L12-T49` : 9 fichiers, tous dans `fichiers_autorises` ; app.ts n'ajoute que l'import, le type d'options, le contexte de session et le branchement.
- Les quatre fichiers propres à la PR (controles-actions.ts contrat et serveur, et leurs tests) sont identiques à 43e95b8 (avis OK précédent) : les corrections antérieures (horloge injectée, pas de date littérale, idempotence déterministe) sont en place.
- main a encore avancé depuis (jusqu'à ba029a8, #897) : fusion simulée sans conflit (`git merge-tree`), openapi.json régénéré identique, tsc serveur vert, 337 tests contrat + controles-actions verts sur le résultat.

Vérifications au SHA relu
- `pnpm verifier` : types, lint, 6388 tests (691 fichiers), tests des gardes et toutes les gardes verts. Seule l'étape types a échoué par le refus de Node 22 du cloud (engine >= 24) ; relancée à la main (`pnpm -r exec tsc --noEmit`, engine-strict levé) : verte.
- Tests ciblés : 14/14 verts (CT-44 http, agent-403, sans-permission-403, sans-reauthentification-401, sans-session-401, motif vide et trace inconnue, entrée sans personne ni société, idempotence, périmètre de l'exercice, exercice inconnu).
- Mutations rejouées sur apps/serveur/src/domaines/controles-actions.ts, chacune rougit au moins un test : agent accepté, réauthentification ignorée, permissions ignorées, rejeu supprimé, contrôle non écartable accepté en 200, session absente remplacée, clé d'idempotence ignorée.
- Taille : 378 lignes (plafond 380), aucune ligne « - - ».
- Journal : 9 lignes, commence par « # Journal L12-T49 ».
- Aucun mot interdit, aucun prix, données fictives, aucune nouvelle dépendance, rien sous .github/ ni dans une garde.

Remarques (non bloquantes)
- La fiche garde « elle n'est PAS planifiée… Ne pas la commencer » alors que la ligne bloque_par a été retirée (D53 à D62) : phrase à nettoyer à l'occasion.
- Taille à 2 lignes du plafond : toute nouvelle fusion qui touche app.ts devra être recomptée.
