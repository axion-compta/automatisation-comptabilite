VERDICT: A CORRIGER
SHA relu : 1a1784b9a3d378771b86a1acd4219b6cd60d7cd9
PR 910, branche pilotage/L15-T59-deblocage, fiche L15-T59 (sensible).

## Ce qui est correct
- Diff : un seul fichier, `pilotage/fiches/L15-T59.md`, 2 ajouts et 1 retrait. Seule la ligne `bloque_par` est remplacée et un point 3 est ajouté à la fin de « À faire ». L'en-tête ne change pas.
- Le déblocage cite D42 et D29 (09/11/2026) et rappelle les quatre conditions de J3a (07/11/2026). Aucune autre décision n'est invoquée.
- Le point 3 reprend la règle 13 de `CONSIGNE-AUTEUR3.md`, avec la même remarque que pour la PR 909 : l'accès direct à la base ou aux fichiers de la console n'y est interdit qu'implicitement.
- `node outils/gardes/fiches.mjs` : 891 fiches cohérentes, 336 avertissements, les mêmes que sur main. Aucun mot interdit, aucun prix.

## Défaut (risque réel)
1. `pilotage/fiches/L15-T59.md:20`, avec les points 1 et 2 et les `criteres` : la fiche est déclarée débloquée, mais elle exige toujours une migration réelle dans `apps/serveur/src/base/migrations/` et des tests qui ne passent que sur une vraie base PostgreSQL :
   - la migration est appliquée deux fois de suite ;
   - deux insertions concurrentes visent une même clé active ;
   - `alerte_journal` doit refuser `UPDATE` et `DELETE` par les droits.

   Or le texte ajouté rappelle J3a, qui demande des données fictives et une interface avec un faux service pour tout ce qui dépend de la console. Le précédent L12-T48 (PR 872) applique J3a ainsi : aucune base réelle, aucune migration exécutée, aucun test sur base. De plus, le dépôt n'a ni pilote PostgreSQL ni base en CI, `nouvelles_dependances: []` interdit d'en ajouter un, et la règle 13 interdit d'écrire l'adresse d'un serveur.

   L'auteur ne peut donc pas remplir les critères sans enfreindre une de ces règles : brancher les tests sur la base du serveur d'Axion IA, ajouter une dépendance, ou affaiblir les tests.

   Le contexte garde aussi « Chemin des migrations à confirmer à ce moment-là (celui de la fiche est provisoire) ». Ce moment est le déblocage lui-même, et rien ne confirme le chemin.

   Correction demandée (à décider par Will) : réécrire la fiche sur le modèle de L12-T48 avant de la débloquer.
   - Une interface et un adaptateur en mémoire portent l'unicité des alertes actives, l'ajout seul du journal et l'isolation par société.
   - Le SQL est écrit comme texte, hors de `migrations/`, et testé par lecture du fichier.
   - Les `criteres` et les `fichiers_autorises` sont adaptés.
   - Le chemin des migrations est confirmé.

   L'autre voie : décider explicitement qu'une base de test est autorisée, en la passant par des réglages, et dire comment la CI y accède.
