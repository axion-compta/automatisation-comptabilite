VERDICT: OK
SHA relu : 326579ca1ca33cfc79efd71fe331ef80d22d4c12

Relecture de la PR #922 (fiche L03-T37, sensible: non, branche lot-03/L03-T37).

Vérifié
- Fichiers modifiés : tous dans `fichiers_autorises` (6 fichiers).
- Taille : 103 + 1 = 104 lignes, sous la limite de 200 de la fiche ; aucune ligne « - - ».
- `creerHandlersEcheances` s'appuie sur `echeances-service.ts` du contrat et valide l'entrée avec le schéma du contrat : aucune logique recopiée.
- Règle 13 (auteur3) : aucune adresse, port ni secret ; données du jeu fictif seulement ; rien en production.
- La suite commune `suiteEcheances` est jouée sur les deux cibles et couvre : intervalle large, tri, bornes incluses, `du` = `au` (sur chaque borne), intervalle vide (avant la première date et en 2000-01-01), `au` avant `du` (400 BAD_REQUEST, y compris à un jour d'écart), dates mal formées (30 février, mois 13, format court, vide, texte), paramètre absent ou en trop, et 29 février bissextile accepté.
- Vitest `contrat-commun.test.ts` : 308 tests verts (4 todo déjà présents).
- Mutations (toutes rougissent) : statut 422 au lieu de 400 sur une entrée invalide, ordre inversé renvoyé en liste vide au lieu d'un 400, `lister(du, du)`, borne haute exclusive dans le service.
- `pnpm verifier` : vert (types, lint, 697 fichiers de test, gardes).
- Aucun prix, aucun mot interdit ; journal de 5 lignes commençant par `# Journal L03-T37`.

Remarques (non bloquantes)
- La garde des fiches signale que L03-T37 et L04-T31 partagent `handlers.ts` et `contrat-commun.test.ts` : il faudra prévoir un conflit de fusion entre les deux.
