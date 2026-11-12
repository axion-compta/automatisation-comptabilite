VERDICT: OK

PR n°1153, fiche L20-T16, seconde relecture au SHA de tête 9cc01fd60e0e964c221c9809be4a23775259129a (avis précédent : A CORRIGER au SHA 125cd3fe5947042eef643533d197d98de86ba755).

## Défaut précédent : levé
1. `listeValide(d.ca.deduire, true)` (`flux.ts:42`) : le cas `{ ca: { prefixes: ['70'], deduire: [''] } }` est refusé et le test `accepte une liste deduire vide` est ajouté (CA 145033). Mutation -> `true` : rouge. Mutation -> `listeValide(d.ca.deduire)` : rouge.

## Pas de régression
- Depuis la relecture précédente, seuls `flux.test.ts` et le journal ont changé ; `flux.ts` n'a pas bougé.
- Vitest sur `flux.test.ts` : 17/17 au vert.
- 4 fichiers, tous dans `fichiers_autorises` ; 220 lignes, soit exactement le plafond (220) ; journal de 4 lignes ; aucun secret, aucun prix, aucun mot interdit ; données fictives.

## Remarques (non bloquantes)
- La taille est au plafond : toute retouche future devra rester à taille constante.
- CI : `tests` et `verifier` sont rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`). Ce test est rouge aussi sur `main` (vérifié en local) et la PR ne le touche pas. Ce n'est pas un défaut de l'auteur. Tous les autres jobs sont verts.
