VERDICT: A CORRIGER
SHA relu : 93be089c9880b0c553b17205e822b0d53c08f74a

Relecture renforcée (PR sensible #822), après la fusion de main (93be089) qui suit l'avis OK sur 43e95b80.

Défaut bloquant (un seul)
1. La PR est de nouveau en conflit avec main (GitHub : mergeable_state « dirty ») : main a avancé jusqu'à fac4a01 (L05-T68, L09-T34, L11-T24, L14-T32) depuis la base e81b6cc. Conflit dans apps/serveur/src/app.ts, bloc `const os = …` de creerRouteur (vers la ligne 67).
   Correction demandée : fusionner origin/main dans lot-12/L12-T49 (pas de rebase, pas de force-push) et garder les deux côtés :
     const profilChamps = creerServiceProfilChamps('soc-lemoine');
     const os = implement(contrat).$context<ContexteSession>();
   en conservant `profil: routesProfil(profilChamps)`, `profilChamps`, `vehiculesBareme`, `sources` venus de main et `controlesActions: routesControlesActions(options.controlesActions)`. Puis régénérer openapi.json par `pnpm contrat:openapi` (jamais à la main) et relancer `pnpm verifier`.
   Résolution simulée par le relecteur : routes.ts et openapi.json fusionnent seuls, openapi.json régénéré identique, tsc serveur vert, 922 tests contrat + serveur verts (y compris avec L08-T56 #831 par-dessus).

Vérifié au SHA relu (rien de perdu, rien de dupliqué par la fusion 93be089)
- La fusion ne touche aucun fichier propre à la PR : controles-actions.ts (contrat et serveur) et leurs tests sont identiques à 43e95b80.
- routes.ts : une seule clé `controlesActions` ; app.ts : un seul branchement, imports de main conservés (santeExploitation, echeances, ventes, pieces…) ; openapi.json régénéré au SHA relu : identique.
- Corrections de l'avis précédent toujours en place : aucune trace d'essai ni date littérale dans apps/serveur/src/domaines/controles-actions.ts (horloge injectée, défaut = heure courante) ; test `idempotence` déterministe (horloge qui avance, 08:00:01 puis 08:00:02).
- Fiche : périmètre respecté (9 fichiers autorisés), 377 lignes sous 380 ; tests CT-44 http, agent-403, sans-reauthentification-401, idempotence présents et verts (14 tests) ; CI verte au SHA relu.
- Mutations (toutes rougissent) : rejeu par clé retiré (idempotence), contrôle `sorte !== 'personne'` retiré (agent-403), refus réauthentification retiré (sans-reauthentification-401).
- Aucun mot interdit, aucun prix, données fictives ; journal 8 lignes, commence par « # Journal L12-T49 ».

Remarques (non bloquantes)
- Taille proche du plafond (377/380) : la résolution du conflit ajoute 2 à 3 lignes dans app.ts ; si le total dépasse 380, le noter au journal.
- La fiche garde « elle n'est PAS planifiée… Ne pas la commencer » alors que la ligne bloque_par a été retirée (D53 à D62) : phrase à nettoyer à l'occasion.
