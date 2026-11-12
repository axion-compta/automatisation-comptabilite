VERDICT: A CORRIGER
ff91ebd2ce7665c3c3017546bb61c32666696c04

PR #1105 (L15-T67), SHA de tête ff91ebd2ce7665c3c3017546bb61c32666696c04 (branche lot-15/L15-T67). Seconde relecture du 12/11/2026, après l'avis A CORRIGER au SHA e84ac624a257926d4a9cdd7f61a7812e151ef353.

## Remarques précédentes : vérification par mutation au SHA ff91ebd2
1. Parallélisme non testé (RE-R1) : LEVÉE. Mutation qui remplace `Promise.allSettled` (PanneauChat.tsx:64) par une boucle `for … await` séquentielle : 1 test rouge sur 10.
2. Remarque `rang` (réponses dans le désordre) : LEVÉE. Nouveau test `reponse-ancienne-arrivee-en-retard-ignoree` ; mutation qui retire `if (moi !== rang.current) return;` (PanneauChat.tsx:65) : 1 test rouge sur 10.
3. Critère « largeurs 56 px, 380 px et 50 % au plus vérifiées par capture » non rempli alors que la fiche passe à `statut: fait` (pilotage/fiches/L15-T67.md:8) : TOUJOURS OUVERT. La fiche n'est amendée ni sur origin/main ni dans une PR de pilotage ouverte. C'est un **défaut de fiche**, pas un défaut de l'auteur : le panneau n'est monté dans aucun écran, et Coque.tsx est hors fichiers_autorises. L'auteur l'a signalé sans le contourner.
   Décision attendue de Will : soit amender la fiche (ajouter Coque.tsx et coque.test.tsx, fixer l'ordre avec L06-T45 et L16-T05), soit remplacer « par capture » par « par test sur le style ». Si le critère est remplacé, cette PR peut passer OK sans autre changement.
4. Bornes 20 et 50 dupliquées du noyau (PanneauChat.tsx:7-8) : non traitée, à juste titre, car le noyau est hors périmètre. Remarque non bloquante, à reprendre dans une fiche de suivi.

## Autres contrôles
- 5 fichiers, tous dans fichiers_autorises ; 245 lignes (max 300). CI 9/9 verte au SHA de tête, `gardes` comprise.
- 10 tests verts en local. Mutation de contrôle : borne 50 portée à 60, 2 tests rouges. Les mutations ont été annulées.
- Journal : 8 lignes. Aucun mot interdit, aucun prix, aucun secret ; les données sont fictives.

## Défaut bloquant
- pilotage/fiches/L15-T67.md:8 : `statut: fait` alors que le critère « par capture » n'est pas rempli (défaut de fiche). Ne pas fusionner avant la décision de Will.
