VERDICT: OK

PR #1174 (L23-T04), seconde relecture. Tête relue : d32a0939c48360a5bc421b7e1bdf21dcea5a1e74
Relecteur Opus, consigne LOT5 section R. Avis précédent : A CORRIGER à la tête c1398b12829c60153daaee77393fddeeed962d58.

## Défaut précédent : levé (vérifié par mutation)
1. `packages/parametres/src/registre-sources.ts:63` : `consultation-90-jours-sans-alerte` vérifie que les seuils `Infinity` et `-Infinity` lèvent une erreur. Mutation rejouée : `!Number.isFinite(seuilJours)` → `Number.isNaN(seuilJours)` fait rougir 1 test.

## Aucune régression
- 4 fichiers, tous dans `fichiers_autorises` ; 223 lignes ajoutées et 1 supprimée (224, maximum 240). Aucun seuil de 90 jours en dur dans `registre-sources.ts`.
- Tests ciblés : 6/6. Mutations supplémentaires, toutes tuées : retrait de `|| seuilJours < 0`, `>` → `>=` à la frontière du seuil.
- Journal de 6 lignes. Aucun secret, aucun prix, aucun mot interdit.

## Remarques
- CI : `tests` et `verifier` rouges à cause du seul test `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`), qui échoue aussi sur `origin/main` (347401ab, reproduit en local). La PR ne touche pas ces fichiers : ce n'est pas un défaut de l'auteur.
- Fiche sensible : fusion par Will seul.
