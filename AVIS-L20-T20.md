VERDICT: A CORRIGER

PR #1160, tête relue : b27d01c18ceeddab4cdbf632f17e1dd3a08e9f8b

Vérifié : 6 fichiers, tous dans `fichiers_autorises` ; 153 lignes (max 200) ; les 3 tests nommés (et la variante « après une action ») sont verts ; schéma inchangé ; profil vide : bloc `a_faire` à l'état `vide` ; aucun mot interdit, secret ni prix ; journal de 7 lignes. CI verte (verifier en attente).
Mutations tuées : relecture `/compteurs` retirée du faux serveur, somme décalée de 1 (service et faux serveur).

## Défauts
1. Mutation survivante, `packages/faux-serveur/src/domaines/tableau-de-bord.ts:43` : retirer `b.code === 'a_faire' &&` dans le `map` laisse les 4 tests verts ; le faux serveur ajoute alors `nombre` dans les `donnees` de tous les blocs (trésorerie, résultat…).
   Correction demandée dans `packages/contrat/src/__tests__/tableau-de-bord-a-faire.test.ts` (`faux-serveur-meme-compteur`) : vérifier qu'aucun bloc autre que `a_faire` ne porte `nombre` (ou que leurs `donnees` sont identiques à celles du service).

## Remarques (non bloquantes)
- Fiche contredite par le code réel : `apps/web/src/ecrans/e01/Ecran.tsx:44` affiche encore `enAttente.nombre` dans le bloc « À faire », et « Voir tout (N) » (ligne 81) est calculé directement depuis `/compteurs`. L'assertion DOM de `e01-compteur-egal-pastille` compare donc `/compteurs` à lui-même ; seule l'assertion réseau sur `nombre` porte la règle. V3-TDB-009 n'est pas visible à l'écran : une fiche de suite autorisant `Ecran.tsx` est nécessaire (limite déjà signalée par l'auteur, hors de son périmètre).
- Branche d'échec du `fetch` interne (`catch`) non testée.
