VERDICT: OK

PR n°1177, fiche L22-T28, tête 71486631381c74fc627b70f1a56594cc7c1d34b3 (seconde relecture, relecteur Opus, lot 5). Avis précédent : A CORRIGER sur d30758e7fdf2ef8f813ee8bb24e9a3f94d827a30.

## Défauts précédents : levés (vérifiés par mutation)
1. `mesure-carte.ts:19`, mesure désactivée par défaut : `() => false` remplacé par `() => true` fait rougir 1 test.
2. Longueurs de la regex ECRAN : `{0,9}`, `{0,5}` et `{1,6}` font chacune rougir 1 test.
3. `temps-humain.mjs:44` : `duree_ms <= 0` fait rougir 1 test.
4. `temps-humain.mjs:64` : `n <= 0` fait rougir 1 test, et retirer `brut === '' ||` aussi.

## Régressions : aucune
- Le code n'a pas changé. Seuls 3 commentaires ont été retirés pour tenir la taille. Les tests ont seulement reçu des ajouts.
- Autres mutations rouges : borne `DUREE_MAX_MS + 1`, borne `duree < -5`, retrait de `if (fait) return`, `valeur >= seuil`.
- 6 fichiers, tous dans `fichiers_autorises` ; 200 lignes pour un maximum de 200 ; 7/7 tests en local (4 + 3) ; journal de 5 lignes ; aucun mot interdit, aucun prix ; e-mail fictif en @exemple.fr.

## Remarques (ne bloquent pas)
- Toujours ouverte : `envoyerParDefaut` n'est exécuté par aucun test, et une `ErreurEcriture` remonte par `resoudre()`. À traiter quand le module sera branché dans un écran.
- CI : `tests` est rouge à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`), qui rougit aussi sur origin/main 347401ab. `verifier` est rouge parce qu'il en dépend. Ce n'est pas un défaut de l'auteur.
