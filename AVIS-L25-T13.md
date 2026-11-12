VERDICT: A CORRIGER

PR #1166 (L25-T13), relue au SHA 5c9d640d77568d972ad965f55e903e3cd35f6732.

Vérifié : fichiers dans fichiers_autorises (6), 215 lignes <= 260, 8 tests nommés présents et verts, `node outils/gardes/migrations.mjs` rend 0, numéro 170 libre sur main, `a_compta.refuser_modification()` identique à celle de 090 et 164 (pas de changement de comportement), CHECK des 7 canaux égal à `CANAUX`, aucun mot interdit, aucun secret, aucun prix, données fictives.
Mutations tuées : `apres` non objet, bornes `>=`/`<=`, tableau et null refusés pour `avant`, gel profond à la lecture, canal inconnu au filtre.

## Défauts (mutations survivantes ; le corps de la PR affirme que chaque comparaison a été mutée)
1. apps/serveur/src/base/depot-action-historique.ts:47 : retirer `|| !texte(l.auteurId)`, `|| !texte(l.objetType)` ou `|| !texte(l.objetId)` laisse les 8 tests verts. Correction : dans `ajout-seul`, refuser (`forme_invalide`) une ligne avec `auteurId: ''`, `objetType: ''`, `objetId: ''` (et une valeur non texte), une assertion par champ.
2. apps/serveur/src/base/depot-action-historique.ts:52 : retirer `structuredClone` à l'ajout laisse les tests verts. L'appelant garde alors une référence sur `avant`/`apres` stockés : modifier son objet après `ajouter` réécrit l'historique, ce qui contredit « ajout seul ». Correction : test qui modifie l'objet `avant` passé à `ajouter` puis vérifie que `lister` rend la valeur d'origine.

## Remarques (non bloquantes)
- Mutations équivalentes, sans test à ajouter : `l.canal === canal` → `startsWith` (aucun canal n'est préfixe d'un autre, canal validé avant) ; retrait du départage `a.rang - b.rang` (tri stable).
- `instant` accepte toute chaîne lisible par `Date.parse` (pas seulement ISO 8601) ; la colonne `le` est timestamptz.
- Le déclencheur ne couvre pas TRUNCATE (cohérent avec 090 et 164).
- CI : job `gardes` rouge pour `garde:portes` (« lot back-end de l'écran e09 sans porte maquette validée », pilotage/portes/e09.json). Ce n'est pas un défaut de l'auteur : la porte E09 relève de Will.
