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
