VERDICT: OK

PR : 929 (fiche L07-T21, non sensible)
SHA relu : 65360c8d375a5df90190b8aeb214dfb6ee1b1466

## Contrôles
- Fichiers modifiés : 8 fichiers, tous dans `fichiers_autorises`. Ni `handlers.ts`, ni `app.ts`, ni le contrat ne sont touchés.
- Taille : 245 lignes ajoutées et 15 retirées, soit 260, exactement le `taille_max_lignes` de la fiche (moins de 400).
- Journal : 4 lignes, il commence par `# Journal L07-T21`.
- Service : `creerServiceAcceptations({ horloge, scenario })` rend `aAccepter`, `accepter` et `journal`. Les données viennent de `donneesDuScenario`, la liste de `acceptationsManquantes`, l'acceptation de `accepter` (L07-T12). Traductions : `version_perimee` → `VERSION_PERIMEE`, `document_absent` → `DOCUMENT_ABSENT`, toute autre erreur est relancée (500). Idempotence par clé. État propre à chaque instance, branché sur le vrai serveur et sur le faux.
- Tests ciblés : 19/19 passent, dont les 6 tests nommés en service et dans la suite commune (vrai serveur Fastify + oRPC, faux serveur MSW).
- Mutations, toutes rouges : réponse non mémorisée par clé, codes d'erreur inversés, acceptation non enregistrée, version altérée côté vrai serveur, statut 200 au lieu de 201 côté faux.
- `pnpm verifier` (Node 22, `engine_strict=false`) : vert. Types, lint, 6520 tests et gardes passent.
- Règle 13 : personne et organisation fictives (`personne-fictive-1`, `organisation-fictive-x`), rien en production, aucun secret. L'hôte de test `http://exemple.fr` est fictif. Aucun mot interdit, aucun prix.

## Remarques (non bloquantes)
- `packages/contrat/src/domaines/acceptations-service.ts:9` : `TYPES_REQUIS = ['cgv']`, alors que la fiche dit `['cgv_compta']`. L'écart est noté au journal, puisque le jeu fictif nomme le type `cgv`. Il faudra l'aligner quand le point Q7 (CGV de la console) sera tranché.
- `acceptations-service.ts:38` : `...corps` est étalé après `personne` et `organisation`. Le vrai serveur ne risque rien, car zod retire les clés en trop. Côté faux serveur, `corpsValide` ne vérifie que `type` et `version`, et un corps qui porte `documents` ou `personne` les remplacerait. Mieux vaut ne passer que `type` et `version`.
- `acceptations-service.ts:15` : les données du scénario sont calculées à la date de création du service, alors que `aAccepter` utilise la date courante. Sans effet pour un serveur en mémoire de courte durée.
- Une même clé avec un corps différent rend la première réponse sans signaler le conflit. C'est acceptable ici, à revoir si le contrat prévoit un 422 sur clé réutilisée.
