VERDICT: OK
SHA relu: f5087c8df948dfbc5373290446758194ee0b0469

PR 973, fiche L07-T43 (abonnement : lecture de l'offre de la console), relecture Opus locale.

Vérifié :
- Périmètre : 5 fichiers, tous dans fichiers_autorises. Le diff fait environ 170 lignes, pour 250 permises. types.ts n'est pas modifié : les codes réutilisés existent (champ_inconnu, entier_invalide, parametre_invalide).
- Critères :
  - clé inconnue refusée (dont prix, montant, tarif, marge) ;
  - libreService `'true'` refusé ;
  - modeIa limité à axion et client_direct ;
  - actionChangement rend lien_portail ou demande_palier ;
  - refus fermé par défaut avec null ou undefined ;
  - le faux service valide par validerOffre et rend null sans offre.
  Chaque critère a son test nommé.
- Cas limites : NaN, Infinity, -1, 1.5, '3', undefined, entrée non objet, tableau, modes vides, en double ou non textuels.
- Les clés sont vérifiées par Object.keys : une clé `__proto__` venue d'un JSON est donc refusée.
- L'unité du quota est un paramètre : aucun « pièces » en dur.
- Un test lit le source (offre.ts et offre-memoire.ts) : aucun prix, tarif, marge, stripe, € ni « pièces ».
- Aucun nom réel, données fictives.
- CI : 9 contrôles verts, dont stryker.

Remarques (non bloquantes) :
- Le test de lecture de source ne cherche pas « montant ». La fiche ne l'exige pas.
- `palier` accepte tout texte non vide. Le contrôle de mots interdits de paliers.ts (nom_de_palier_interdit) n'y est pas appliqué. C'est à voir quand la console fixera les codes.
- Le faux service ne rejoue que 3 refus de validerOffre, pas toute la batterie. C'est acceptable, puisqu'il délègue à validerOffre.
