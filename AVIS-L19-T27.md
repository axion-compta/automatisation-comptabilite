VERDICT: OK

PR #1217 (L19-T27). Tête relue : c51776b533767df12c57de75813530d05ee3f7f2
Relecteur Opus, consigne LOT5 section R. Seconde relecture après correction (avis précédent A CORRIGER sur 791c800a303c85cc46485fd2a3bc6d85e5736dfc).

## Défauts précédents : levés
1. Ancrages `creation` et `periode` omis sans signal : levé. `echeancesSociete` (packages/noyau/src/alertes/calendrier.ts:101) lève `ErreurCatalogue('ancrage_non_gere')` pour un type retenu par le profil. Un type écarté par le profil ne lève rien. Le test `ancrage-non-gere-signale` couvre les deux ancrages et le cas écarté.
2. `releveLe` présent mais `source` absente donnait `dateAVerifier: false` : levé (calendrier.ts:106). Le test `sans-releve-a-verifier` couvre ce cas.

## Vérifié
- 5 fichiers, tous dans `fichiers_autorises`. 111 lignes ajoutées et 2 supprimées (maximum 200). Garde périmètre verte en local.
- 134 tests verts (`src/alertes` et `src/echeances`). `tsc --noEmit` vert.
- 5 mutations, toutes tuées : retrait de `|| e.source === undefined` ; retrait de l'ancrage `periode` ; retrait de `conditionRemplie` ; refus de tout type retenu (6 tests rouges) ; année civile prise sur le début.
- Pas de régression : `echeancesDe` est inchangé pour `dateAVerifier`, et les tests existants du catalogue et du calendrier restent verts.
- Aucune date légale inventée (délais de test marqués INVENTÉS, domaine exemple.invalid). Aucun secret, aucun prix, aucun mot interdit. Journal de 7 lignes, avec le bon en-tête.

## CI : rouge, sans lien avec la PR
`tests` et `verifier` échouent sur un seul test, `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues` (colonne `porte_rgpd` au lieu de `porte`). Le même test échoue en local sur `origin/main` (6181242502ba460ea74a102050ff6bbd1dbd2bb0). Le diff ne touche pas `outils/exploitation/`. Ce n'est pas un défaut de l'auteur. Il faut corriger `main`, puis relancer la CI avant la fusion, car le critère « pnpm verifier » doit passer.

## Remarques (non bloquantes)
- pilotage/journal/L19-T27.md:6 : la ligne « Limite » dit que ces types « ne sont pas produits ». Le code lève désormais `ancrage_non_gere`, donc la ligne mériterait d'être précisée.
- catalogue.ts:75 : une `source` faite seulement d'espaces est acceptée. On pourrait la refuser avec `trim()`.
- Remarques de la première relecture, toujours à trancher par Will : la fiche dit « `releveLe` obligatoire » alors que le code le rend facultatif (son absence donne « à vérifier ») ; `annee_civile` ne prend que l'année de la fin ; le début de l'année comptable est validé mais pas utilisé comme ancre.
- Fiche sensible (dates légales) : fusion par Will seul.
