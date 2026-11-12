VERDICT: OK

PR n°1154, fiche L26-T09, seconde relecture au SHA de tête b6d38961c5051df9533d0c6facfb74289642a8b2 (avis précédent : A CORRIGER au SHA 78f1674c1df71548169ad5a35364e6f8cb9d0ae5).

## Défauts précédents : levés
1. Frontière haute de l'empreinte : `${ok}0` refusé. Mutation `[0-9a-f]{64}` -> `{64,}` : rouge.
2. `validerImage` : `${ok} ` et `a@${ok}` refusés. Mutation `/\r?\n$/` -> `/\s+$/` : rouge. Mutation `^[^\s@]+@` -> `^[^\s]+@` : rouge.
3. La remarque sur `comparer.mjs:25` est reprise : nouveau test `un-seul-dossier-vide-signale-les-manquantes`. Mutation `&&` -> `||` : rouge.

## Pas de régression
- Depuis la relecture précédente, seul `outils/captures/test/comparer.test.mjs` a changé.
- `node --test outils/captures/test/comparer.test.mjs` : 8/8 au vert. Mutation relancée (capture manquante au second passage jamais signalée) : rouge.
- 8 fichiers, tous dans `fichiers_autorises` ; 229 lignes (plafond 250) ; journal de 6 lignes ; aucun secret, aucun prix, aucun mot interdit.

## Remarques (non bloquantes, à décider par Will, hors fichiers_autorises)
- Les tests `node:test` de `outils/captures/test/` ne tournent dans aucun job de CI.
- La fiche passe à `statut: fait` alors que `image.txt` n'a pas d'empreinte et que `--deux-passages` n'a pas été exécuté. Ce statut débloque L26-T10.
- `lancer.mjs` réécrit le `node_modules` de l'hôte.
- CI : `tests` et `verifier` sont rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs`. Ce test est rouge aussi sur `main` et la PR ne le touche pas. Ce n'est pas un défaut de l'auteur.
- Fiche sensible : la fusion revient à Will seul.
