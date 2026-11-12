VERDICT: A CORRIGER

PR #1105, SHA de tête 27d3b5b602f2b66d38be6ba33d1cc474b546697d (branche lot-15/L15-T67). Relecture du 12/11/2026.

Avis antérieur (PR #1098, A CORRIGER) : chaque point vérifié
- Défaut 1 (CI rouge, repli CORPS_PR refusé car la branche n'était pas une branche de fiche) : CORRIGÉ. La PR vient de la branche `lot-15/L15-T67` ; `gardes` et `verifier` sont verts au SHA de tête (CI 9/9). Le retrait de `bloque_par` est maintenant dans cette PR.
- Remarque Coque.tsx (ajout aux fichiers_autorises pour brancher le panneau et produire la capture) : NON TRAITÉE. `PanneauChat` n'est monté nulle part ; Coque.tsx monte toujours `Discussion`. La fiche n'a pas été élargie, et c'est correct pour l'auteur. Voir le défaut 2.
- Remarque L16-T05 / L06-T45 (ordre sur Coque.tsx) : reste à trancher par Will.

Ce qui est bon
- Périmètre : 5 fichiers, tous dans fichiers_autorises ; 229 lignes (taille_max 300). Dépendances L15-T56 et L15-T54 « fait ».
- 9 tests passent. Mutations rouges : priorité de l'installation guidée sur le choix de la personne (2 tests rouges) ; borne 50 % portée à 60 (2 rouges) ; source en panne non signalée (rouge).
- Clés `chat_etat` et `chat_largeur_pct` : ce sont bien les clés par appareil du noyau (valider.ts:18). Textes dans packages/textes, vouvoiement. Journal : 8 lignes, commence par « # Journal L15-T67 ». Aucun mot interdit, aucun prix.

Défauts
1. apps/web/src/socle/__tests__/panneau-chat.test.tsx:84-90 (`assemble-deux-sources-en-parallele`) : le test ne vérifie pas le parallélisme exigé par RE-R1. La mutation qui remplace `Promise.allSettled(sources.map(...))` (PanneauChat.tsx:64) par une boucle `for … await` séquentielle laisse les 9 tests verts : chaque faux pousse dans `lancees` dès son appel, si bien que l'ordre séquentiel passe aussi.
   Correction demandée : faux à promesses différées. La source A ne se résout pas tant que la source B n'a pas été appelée : on vérifie que `lancees` vaut ['a','b'] AVANT de résoudre A.
2. Critère de la fiche « largeurs 56 px, 380 px et 50 % au plus vérifiées par capture » : non rempli, et la fiche passe pourtant à `statut: fait` (pilotage/fiches/L15-T67.md:8). Le corps de la PR et le journal le reconnaissent : seul le style est testé. Ce n'est pas faisable dans les fichiers_autorises actuels, puisque le panneau n'est branché dans aucun écran. C'est un DÉFAUT DE FICHE, à trancher par Will : soit amender la fiche (ajouter Coque.tsx et coque.test.tsx, et fixer l'ordre avec L06-T45 et L16-T05), soit remplacer le critère « par capture » par « par test sur le style ». Tant que ce n'est pas tranché, il ne faut pas fusionner avec `statut: fait`.

Remarques
- PanneauChat.tsx:7-8 : les bornes 20 et 50 dupliquent `LARGEUR_MIN_PCT`/`LARGEUR_MAX_PCT` de packages/noyau/src/preferences/valider.ts:16-17 (non exportées, et le noyau est hors périmètre). Une fiche de suivi devrait les exporter et les réutiliser.
- PanneauChat.tsx:62 : la protection contre les réponses dans le désordre (`rang`) n'est pas testée.
