VERDICT: A CORRIGER

# Avis L00-T83 (PR #1032)

SHA relu : 3a84d86dec98d1f725b1933aa448a54ff4808a7c (branche `lot-00/L00-T83`, un commit sur `origin/main`).

## Vérifié et correct
- Périmètre : les 27 fichiers modifiés sont tous dans `fichiers_autorises` ; 249 lignes, sous le plafond de 380 ; aucune ligne « - - ».
- Gardes : `node outils/gardes/fiches.mjs` est vert (914 fiches) ; `node scripts/verifier.mjs --gardes` est vert après `pnpm install` (avant l'installation, seule `licences` était rouge, faute de `node_modules`). La garde `perimetre` de la CI est rouge à cause de la PR #1031 en attente : ce n'est pas compté comme défaut.
- La fiche L00-T83 diffère de celle de la PR #1031 par `statut: fait` seulement.
- D88, comparé mot pour mot :
  - L08-T54 : exercice à blanc en code, sur une société témoin fictive ; les symboles cités (`resultatExercice`, `RaisonExercice`, `ErreurRgpd` et ses codes, `donneesPermises`, `poserArret`, `reprendre`, `EvenementArret`, `EvenementReprise`) existent bien.
  - D45 dans L05-T66 et L06-T48 : aucune durée fixée ; la durée est un paramètre daté et sourcé, vide par défaut ; durée absente = rien n'est effacé. `ParametreLegal` et `parametreAuJour` existent.
  - P2 dans L15-T63 : aucun fournisseur d'e-mail choisi ; interface et faux ; aucun nom de fournisseur.
  - Q3 dans L05-T60 : transcription contre une interface et un faux ; aucun fournisseur d'IA ne reçoit l'audio.
  - Q11 : L05-T67 n'est pas touchée.
  - L04-T49 est découpée en L04-T56, L04-T57 et L04-T58 ; les fichiers des trois fiches sont disjoints et les 5 exigences sont toutes reprises. `pdfjs-dist` est déjà une dépendance de `apps/serveur`, et les chemins cités (`ports.ts`, `ports-memoire.ts`, `etape-entree.ts`, `nettete.ts`, `texte-cache.ts`) existent.
- Blocages : aucun blocage réel n'est levé à tort.
  - Gardées bloquées : L06-T38 (ordre des fusions), L06-T42 (via L06-T38), L11-T41 (L11-T39 reste bloquée sur `main`) et L15-T67 (`Coque.tsx` et `coque.test.tsx` sont bien dans L06-T45).
  - Non touchées : L06-T46, L02-T70, L11-T45 et les fiches de L00-T81.
  - Le numéro de migration 091 est bien pris par L05-T62 (L00-T81).
- Aucun mot interdit, aucun prix, aucune durée de conservation. Hetzner ne figure que dans la citation de la décision D42 ; il est retiré de L08-T54. Le journal fait 9 lignes et commence par `# Journal L00-T83`.

## Défauts (à corriger avant fusion)
Le point 1 de la fiche L00-T83 demande d'écrire « contre une interface et un faux serveur » quand la fiche exige la vraie base. Certains critères et certaines étapes « À faire » des fiches levées sont pourtant restés écrits pour la vraie base. Un auteur doit lancer chaque critère ; ceux-ci ne peuvent pas passer.
1. `pilotage/fiches/L06-T40.md:16` : le critère demande « T-JRN-2, T-JRN-3 et T-JRN-4 verts sur une vraie base », ce qui contredit le contexte (ligne 20 : dépôt en mémoire). Correction : « … verts contre le faux (transaction et verrou d'un dépôt en mémoire), aucune base réelle ni réseau dans les tests ».
2. `pilotage/fiches/L06-T41.md:16` : le critère demande « verts sur la vraie chaîne » alors que le coffre, le stockage et les tâches de fond sont désormais des faux. Correction : préciser « sur la chaîne de L06-T15 avec un faux coffre et un faux stockage, aucune clé réelle ».
3. `pilotage/fiches/L15-T64.md` (« À faire » 1 et 2) : la fiche demande toujours un « dépôt de données qui remplace le service en mémoire » et des « tests d'intégration : … performance mesurée », alors que le contexte (ligne 20) annonce un dépôt en mémoire derrière la même interface et une migration contrôlée sur son texte. Correction : dire ce que l'auteur écrit (texte SQL contrôlé par la garde `migrations`, requête paramétrée testée sur ses gabarits, dépôt en mémoire) et renvoyer la mesure de performance sur une vraie base au feu vert J10 (« Hors périmètre »).

## Remarques (non bloquantes)
- `pilotage/fiches/L06-T39.md` : les critères « migrer appliqué deux fois sans changement » et « C03 : clé composée refuse … » sont à lire sur le texte (`IF NOT EXISTS`, clé étrangère composée). On peut l'écrire, comme L08-T45 l'a fait (« aucune base réelle ni réseau dans les tests »).
- `pilotage/fiches/L08-T54.md:20` : `BLOQUE-L08-T54.md` se trouve sur la branche `bloque/L08-T54`. Le préciser.
- `pilotage/fiches/L06-T48.md:20` : le contexte ajoute « alerte » à « aucune purge », ce que D88 ne dit pas. C'est acceptable, mais à confirmer.
- Pas de tests à faire tourner ni de mutations à faire : `tests_requis: non`, la PR ne touche que des fiches.
