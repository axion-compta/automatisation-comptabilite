VERDICT: OK
SHA relu: 4a8f96b574fd45c1eef662df45606902d88b450c

PR 838, fiche L10-T33 (branche lot-10/L10-T33). Relecture Opus locale au SHA de tête, fiche lue sur origin/main. Reprend l'avis au SHA 11750a3c après le commit correctif 4a8f96b5.

Corrections bloquantes de l'avis précédent :
1. pilotage/fiches/L10-T33.md : « statut: fait », seule ligne changée. Fait.
2. ventes-service.ts : le 411000 prend désormais la somme des HT et de la TVA, donc chaque écriture est équilibrée (avoirs compris, sens inversés). Nouveau test `ecritures-equilibrees-sur-toutes-les-pieces` sur toutes les pièces du jeu, avec au moins une écriture. Mutation « retour à ttcCentimes » : le test rougit. Fait.

Non bloquant traité : filtre-par-etat vérifie la valeur exacte de joursDeRetard pour chaque pièce ; la mutation « constante 1 » rougit maintenant. Journal : comptes codés en dur et TVA regroupée notés (10 lignes, la limite).

Vérifié de nouveau :
- Périmètre : 7 fichiers, tous dans fichiers_autorises ; 255 ajouts et 9 suppressions (maximum 320) ; aucune ligne « - - ».
- Tests : contrat ventes 8/8, serveur ventes et branchement 2/2, juridique-ecriture 14/14 (routesEcritureSansEnTete() reste []). openapi.json régénéré sans écart.
- pnpm verifier en local : toutes les gardes et étapes au vert sauf « types », rouge seulement à cause du Node du conteneur (22 au lieu de 24 ou plus, refus du moteur pnpm). tsc --noEmit lancé à la main sur packages/contrat et apps/serveur : aucune erreur. En CI, types, tests, lint, gardes, e2e, stryker, licences et gitleaks sont verts ; la tâche agrégée `verifier` était encore en file au moment de la relecture : à confirmer verte avant fusion.
- Aucun mot interdit, prix, secret ni nom réel ; pas d'alias d'import de it/test.

Remarque (non bloquante) : quand le TTC du jeu s'écarte de HT + TVA (VP-1-038), le 411000 de l'écriture diffère du ttcCentimes affiché. Ce choix est voulu, il est commenté dans le code et noté au journal.
