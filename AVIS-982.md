VERDICT: OK
SHA relu: f3d4e5bf9a454471454617f1605be7fa11b00411

PR 982, fiche L11-T33 (branche lot-11/L11-T33), sensible : non. Relecture Opus locale, fiche lue sur origin/main.

Vérifié :
- Périmètre : 5 fichiers, tous dans fichiers_autorises (Bandeau.tsx, Ecran.tsx, e17-bareme.test.tsx, fiche passée à fait, journal). Rien dans .github/, socle/, api.ts, fr.ts, e17.ts. Aucune dépendance.
- Taille : 150 ajouts, 3 suppressions (maximum 220). Aucune ligne « - - », aucun octet NUL. Journal : 7 lignes. e17.test.tsx (L11-T31) non modifié.
- Critères relancés au SHA relu : vitest src/ecrans/e17/ 29/29, dont les 7 tests nommés ; les 22 tests de L11-T31 restent verts ; pnpm verifier en local : types, lint et gardes verts ; seuls rouges, des tests de durée hors PR (bandeau-acces, chat/filtre-sortie), verts relancés seuls. CI verte au SHA relu.
- Tests réels : 8 mutations sur 8 détectées (ligne valide ignorée, 404 muet, année figée, période inversée envoyée, query du/au ignorée, rôle status, date du jour forcée, message d'ordre absent).
- Exactitude : bandeau role status, texte e17.bareme, année tirée de la date ; masqué si valide, affiché sinon (404 et erreur compris), rien pendant le chargement ; champs du/au ; période inversée : message e17.periode.ordre, aucune requête, dernière période valide gardée.
- Données fictives, aucun mot interdit, prix, secret ni nom réel. it importé sans alias. Corps de PR avec Fiche et V3-MOT-061, V3-MOT-006.

Non bloquant :
1. Ecran.tsx:65 : sans date de fin, la date du jour vient de toISOString (UTC) ; le 1er janvier peu après minuit, heure de Paris, le bandeau lit l'année précédente. Chemin non testé. Préférer une date locale AAAA-MM-JJ.
2. Ecran.tsx:98 : bandeau masqué quand /frais est en erreur (choix expliqué au journal, à cause du test erreur-sans-chiffre-partiel). L'écran affiche alors l'erreur ; choix à valider par Will.
3. Seul le 404 de la ligne de barème est testé, pas un 5xx (même chemin de code).
