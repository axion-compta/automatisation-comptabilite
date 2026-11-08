# Consigne complémentaire : compléter une fiche coquille (leçons de la relecture de la PR 670)

À lire EN PLUS de CONSIGNE-AUTEUR3.md et du prompt reçu.

(a) `depend_de` doit citer TOUTES les fiches qui définissent ce que la fiche utilise. Vérifie par recherche dans le code (grep des symboles cités) et dans les fiches de main : un symbole défini par une fiche absente de `depend_de` est un défaut.
(b) Aucun nombre de lignes ou d'éléments écrit en dur dans un test quand la donnée peut évoluer (CSV, catalogue, liste de routes) : le test compare à la donnée lue, plus la présence de deux ou trois éléments connus.
(c) `taille_max_lignes` réaliste : estime les fichiers un par un, plafond 400 par PR ; jamais de phrase « écrire compact pour tenir N lignes » dans les Pièges. Si le travail dépasse 400 lignes, propose le découpage en sous-fiches dans la section Hors périmètre.
(d) Chaque exigence de spec que la fiche renvoie à « d'autres écrans/fiches » doit avoir une fiche porteuse NOMMÉE (ID existant sur main), sinon écris « fiche de suite à créer : <objet> ».
(e) La PR ne change QUE `pilotage/fiches/<ID>.md`. Aucun autre fichier, aucun journal.
(f) `fichiers_autorises` doit contenir au moins un vrai fichier `*.test.ts` ou `*.spec.ts` si `tests_requis: oui`. Pour le faux serveur (packages/faux-serveur), ajoute `packages/faux-serveur/src/__tests__/contrat-commun.test.ts` si la fiche ajoute un domaine joué par ce test. Évite `routes.ts`, `openapi.json`, `app.ts` sauf nécessité absolue, dite au Contexte.
(g) Mots interdits (règle 12 de CLAUDE.md) : « conforme », « sans erreur », « garanti », « juriste », « PDP » ; aucun prix chiffré ; SIREN fictifs seulement (123456782, 987654324).
(h) Fiche qui dépend d'une autre coquille non encore complétée : ne bloque pas ; complète-la quand même et garde `depend_de` (le train n'implémentera que dans l'ordre).

# Consigne du relecteur de complétion

Tu juges la FICHE complétée, jamais le code (il sera écrit plus tard). Vérifie les points (a) à (h) ci-dessus, la cohérence avec la spec citée et les décisions de Will du 07/11/2026, que id/titre/lot/exigences/sensible/statut sont inchangés et que le diff ne touche que pilotage/fiches/<ID>.md. Ne réclame jamais du code, un test ou un journal.

# Consigne du concepteur de complétion (texte COMPLET du travail)

Règles générales : `git fetch origin consignes/auteur3` puis lis CONSIGNE-AUTEUR3.md (`git show origin/consignes/auteur3:CONSIGNE-AUTEUR3.md`), y compris le point 10 (branche `bloque/<ID>` avec `BLOQUE-<ID>.md` si tu es bloqué). Ces fiches sont des COQUILLES : leur `fichiers_autorises` ne contient que `pilotage/…`, le critère dit « fiche à compléter quand le blocage est levé » et une ligne `bloque_par:` les bloque. Will a TRANCHÉ ces blocages le 07/11/2026 (D43 fournisseurs d'IA de l'UE en liste fermée modifiable ; D56 à D62 ; J3a donné avec 4 conditions : données FICTIVES seulement ; fiches sensibles avec relecture Opus ; aucune production sans feu vert J10 ; ce qui exige le vrai schéma de la console s'écrit contre une interface et un faux serveur).

Pour chaque fiche, dans l'ordre donné (une branche et un commit par fiche) : lis la fiche coquille, ses dépendances (fiches `depend_de` et leur code et journal sur origin/main), des fiches voisines déjà faites du même lot comme modèles de forme, la spec citée ; puis RÉÉCRIS la fiche, et ne modifie QUE `pilotage/fiches/<ID>.md` : retire la ligne `bloque_par` en citant au Contexte la décision de Will du 07/11/2026 ; `fichiers_autorises` = liste précise des fichiers de code, de tests et du journal `pilotage/journal/<ID>.md`, sans fichiers communs sensibles (routes.ts, app.ts, openapi.ts, plan.ts, package.json) sauf nécessité absolue, dite au Contexte ; `taille_max_lignes` réaliste, 300 au plus ; `tests_requis: oui` avec critères testables (cas limites) ; À faire en étapes numérotées ; Hors périmètre ; Pièges ; l'IA ne reçoit que des données pseudonymisées. Garde inchangés : id, titre, lot, couloir, ordre, exigences, depend_de (sauf ajout justifié selon le point a), sensible, statut: a_faire. Vérifie avec `node outils/gardes/fiches.mjs` (`npm_config_engine_strict=false pnpm install --frozen-lockfile` si besoin) et note les recoupements de fichiers avec d'autres fiches a_faire.

Branche exacte `lot-NN/<ID>` depuis origin/main ; commit terminé par la ligne « Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com> » ; `git push origin lot-NN/<ID>` (jamais de force-push, jamais sur main) ; pas de gh, pas de PR. Réponse finale : « <ID> COMPLÉTÉE » + SHA, ou « <ID> BLOQUÉE » + raison.
