VERDICT: A CORRIGER

# Avis L00-T84 (PR #1049 fiche seule, PR #1050 exécution, SENSIBLE)

SHA relus :
- PR #1049 : 8343b1664d096a33d7757a86659b134511b7e399
- PR #1050 : a1ce41dc730a49ec7e3b6be5080ee6d723933188

## Vérifié
- Fichiers : #1049 ne touche que `pilotage/fiches/L00-T84.md` ; #1050 ne touche que les 5 `fichiers_autorises`. Taille #1050 : 95 + 14 = 109 lignes (max 140).
- `node outils/gardes/fiches.mjs` et `node scripts/verifier.mjs --gardes` verts sur les deux têtes ; les deux critères `git grep` rendent des lignes (2 et 5).
- Mutations : `depend_de` de L09-T52 vers une fiche inconnue, ou retrait de la dépendance L09-T49, font rougir `garde:fiches` (fichiers partagés sans dépendance).
- L10-T37 : seul `ventes-indicateurs.test.ts` est ajouté ; ligne 62 vérifiée sur main ; `toEqual` exact exigé, `toContain` et `arrayContaining` interdits. Aucune vérification retirée.
- Les 7 tests nommés de l'ancienne L09-T49 sont tous repris (2 dans L09-T49, 5 dans L09-T52), plus `chemins-prefixes-dans-l-openapi`. Tests existants : « sans retirer ni affaiblir une assertion ».
- Faits vérifiés sur main : `versSessionRoute` (`apps/serveur/src/securite/jeton.ts:105`) perd `societeId` ; `profil.test.ts` l. 77-78 du contrat ; `suite-profil.ts` joué par `contrat-commun.test.ts` ; L00-T81 fait ; L09-T52 libre ; notes `bloque/L10-T37` et `bloque/L09-T49` présentes.
- Décisions : seules D42, D29 (09/11/2026) et J3a (07/11/2026), déjà dans l'ancienne fiche, sont citées ; aucune décision de Will inventée ; aucun `bloque_par` levé.
- Aucun mot interdit, aucun prix, aucune donnée réelle ; journal de 9 lignes commençant par `# Journal L00-T84`.

## Défaut bloquant
1. Exigence de préfixe et de session retirée pour une partie des routes du profil. L'ancienne L09-T49 (main, À faire, point 1) exigeait le « préfixe de société sur les routes du lot (L09-T30 à T35) », donc aussi régimes (L09-T31, `/profil/regimes/*`), paramètres (L09-T32) et identité (L09-T33). La nouvelle fiche les déclare « restent sans préfixe » (`pilotage/fiches/L00-T84.md`, Hors périmètre ; `pilotage/fiches/L09-T49.md`, Hors périmètre ; journal l. 7), sans fiche de suivi. Cela contredit la phrase « Aucune exigence d'accès retirée » de L00-T84. Le motif donné (fichiers absents des `fichiers_autorises` d'origine) explique le découpage, mais il ne justifie pas l'abandon.
   Correction demandée (dans #1049, puis #1050) : créer une fiche de suivi sensible (par ex. L09-T53, dépendant de L09-T49) qui pose le préfixe `PREFIXE_ROUTES_SOCIETE` et la session exigée sur les routes des régimes, des paramètres et de l'identité, avec contrat, vrai serveur, faux serveur et tests adaptés (mêmes tests 401 et 404 au même corps). L'ajouter aux `fichiers_autorises` et aux critères de L00-T84, puis remplacer « restent sans préfixe » par « préfixe et session : L09-T53 ». Relever `taille_max_lignes` si besoin : environ 34 lignes de plus dépassent 140.

## Remarques (non bloquantes)
- `pilotage/fiches/L00-T84.md`, À faire 2 : « vérifié sur `main` : … les écrans E45 et E39 ». E39 n'est pas sur main (PR #1048 ouverte) : écrire « E45 (main) et E39 (PR #1048) ».
- Le nouvel `apps/serveur/src/app.ts` de L09-T49 et L09-T52 recoupe L04-T51 et L06-T38 (nouveaux avertissements de `garde:fiches`). L06-T38 attend déjà un accord de Will sur l'ordre des fusions qui cite L09-T49 : à signaler dans les Pièges.
- L09-T49 : ajouter un test montrant qu'un chemin `/profil` sans préfixe donne 404 sur le vrai serveur. Aujourd'hui, seul l'OpenAPI le vérifie.
