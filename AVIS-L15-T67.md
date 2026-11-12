VERDICT: A CORRIGER

PR #1105 (L15-T67), SHA de tête e84ac624a257926d4a9cdd7f61a7812e151ef353 (branche lot-15/L15-T67). Relecture du 12/11/2026, après l'avis A CORRIGER au SHA 27d3b5b602f2b66d38be6ba33d1cc474b546697d.

Vérification des défauts de l'avis précédent
1. Parallélisme non testé (RE-R1) : CORRIGÉ. `assemble-deux-sources-en-parallele` (apps/web/src/socle/__tests__/panneau-chat.test.tsx) retient la source A par une promesse différée et vérifie `lancees` = ['a','b'] avant de la résoudre. Mutation sur ce SHA (boucle `for … await` séquentielle à la place de `Promise.allSettled`, PanneauChat.tsx:64) : test rouge.
2. Critère « largeurs 56 px, 380 px et 50 % au plus vérifiées par capture » : TOUJOURS NON REMPLI, et la fiche passe à `statut: fait` (pilotage/fiches/L15-T67.md:8). Sur origin/main, la fiche n'a pas été amendée (critère inchangé, Coque.tsx toujours hors fichiers_autorises). C'est un DÉFAUT DE FICHE, pas un défaut de l'auteur, qui l'a signalé sans le contourner. Décision attendue de Will : amender la fiche (Coque.tsx et coque.test.tsx, ordre avec L06-T45 et L16-T05) ou remplacer « par capture » par « par test sur le style ». Ne pas fusionner avec `statut: fait` avant cette décision.

Autres contrôles
- Périmètre : 5 fichiers, tous dans fichiers_autorises ; 232 lignes ajoutées (taille_max 300). CI 9/9 verte sur ce SHA.
- 9 tests verts en local. Aucun mot interdit, aucun prix, données fictives.

Remarques (non bloquantes)
- PanneauChat.tsx:65 : la protection contre les réponses dans le désordre (`rang`) n'est toujours pas testée (mutation qui retire le contrôle : 9 tests verts).
- PanneauChat.tsx:7-8 : bornes 20 et 50 dupliquées de packages/noyau/src/preferences/valider.ts:16-17 ; fiche de suivi.
