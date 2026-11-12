VERDICT: OK

PR n°1141, fiche L20-T11. Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : b20c3d90f02d974dcf9ad4d0e4310b2fb840a5b2

## Défauts précédents : levés (vérifié par mutation)
1. Contenu hors signature du suivi : la signature inclut désormais l'empreinte de chaque fichier lu (`zip-exercice.ts:38-40`). Test `contenu-change-de-meme-taille-refait` : un contenu changé de même taille refait la partie et le ZIP contient le nouveau contenu. Mutation « empreintes retirées de la signature » : rouge. Commentaire et journal disent maintenant ce que fait le code.
2. Mutations survivantes : « rayons retirés de la signature », « plan retiré de la signature », « contrôle final des parties supprimé », « contrôle final du manifeste supprimé » : toutes rouges (tests `signature-du-suivi-depend-des-rayons-et-du-plan` et `controle-final-echoue-si-le-depot-altere-ou-perd-une-partie-ou-le-manifeste`).

## Aucune régression
- Mutations rejouées, toutes rouges : relecture d'empreinte à la reprise, filtre exercice, filtre rayon, notation du suivi, rayons vides acceptés.
- `vitest` sur `apps/serveur/src/exports/__tests__/zip-exercice.test.ts` : 9 sur 9 verts ; les 5 tests nommés de la fiche sont présents.
- 4 fichiers, tous dans `fichiers_autorises` ; 219 lignes ajoutées et 1 retirée (max 220) ; aucune ligne « - - ». Journal de 4 lignes, commence par « # Journal L20-T11 ».
- eslint propre ; `garde:perimetre` vert. Aucun secret, prix, nom réel ni mot interdit ; données fictives.
- CI : `tests` et `verifier` rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`, en-tête `porte_rgpd`), rouge aussi sur main ; la PR n'y touche pas : pas un défaut de l'auteur. `gardes`, `types`, `lint`, `e2e`, `gitleaks` verts.

## Remarques (non bloquantes)
- Fiche `sensible: oui` : fusion par Will seul.
- La mutation « rayons non triés dans la signature » survit : l'ordre des rayons passés change alors le suivi (reprise perdue, jamais de ZIP faux). Un test pourra l'ajouter plus tard.
- Tout le contenu est lu une première fois pour la signature, puis relu pour les parties à refaire : coût en lecture doublé sur un gros exercice, acceptable pour la fiche.
