VERDICT: OK

PR #1103, SHA de tête dd1bb40a889102ccb090fcaa585df676ab87c614 (branche lot-06/L06-T38). Relecture du 12/11/2026.

Avis antérieur (PR #1096, amendement de fiche, OK) : point demandé vérifié. Les trois dépendances (L06-T36, L06-T08, L00-T50) sont « fait » sur main ; #1097 (L06-T42) doit toujours être fusionnée après cette PR.

Vérifications
- Périmètre : 6 fichiers, tous dans fichiers_autorises ; aucun domaine, test existant, routes.ts ni app.ts modifié. 195 lignes ajoutées, 1 retirée (taille_max 200, garde verte).
- Liste `DOMAINES_SANS_PREFIXE` : comparée à un relevé indépendant sur ce SHA (46 clés de `contrat`) : exactement les 42 clés non préfixées, aucune en trop, aucune absente.
- Les 6 tests nommés passent (cliquet 3, société 3 + `sans-session-401`).
- Mutations (le test doit rougir) : 404 remplacé par 400 pour un chemin d'une société étrangère -> rouge ; objet d'une autre société en 400 au lieu du 404 « inexistant » -> rouge ; 400 `societe_unique` remplacé par un succès -> rouge ; clé retirée, doublée ou inconnue dans la liste -> rouge (3 mutations). La mutation « retirer `duChemin === null` » survit, mais elle est équivalente (`includes(null)` rend déjà 404).
- CI au SHA de tête : 9/9 verts. Journal : 6 lignes, commence par « # Journal L06-T38 ». Aucun mot interdit, aucun prix, données fictives.

Remarques (non bloquantes)
- pilotage/journal/L06-T38.md:3 et corps de la PR : « 44 clés » ; la liste en compte 42 (le compte exact est 42). À corriger à l'occasion.
- Corps du 404 : `verifierRequeteSociete` rend `{ code: 'introuvable' }` (REPONSE_INTROUVABLE du noyau), alors que `exigerSociete` (apps/serveur/src/domaines/profil.ts, branché par L09-T49 et L11-T38) rend `{ code: 'INTROUVABLE', status: 404 }`. Les deux ne sont pas encore branchés ensemble ; L06-T42 ou la fiche qui branchera cette fonction doit choisir un seul corps.
- Fiche sensible (isolation) : fusion par Will seul.
