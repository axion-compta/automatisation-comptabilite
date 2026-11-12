VERDICT: A CORRIGER

PR #1217 (L19-T27). Tête relue : 791c800a303c85cc46485fd2a3bc6d85e5736dfc
Relecteur Opus, consigne LOT5 section R. Première relecture. Fiche sensible (dates légales).

## Vérifié
- Fichiers : les 5 fichiers du diff sont dans `fichiers_autorises`. 97 lignes ajoutées et 1 supprimée (maximum 200). Aucun octet NUL.
- Les 6 tests nommés sont présents. 94 tests passent en local (`src/alertes/__tests__` et `src/echeances/__tests__`), et les tests existants du catalogue et du calendrier restent verts. La CI de la tête est verte.
- 12 mutations essayées, toutes tuées. Elles portent sur :
  - la validation du début, de la fin et de leur ordre (`>` → `>=`) ;
  - l'année de la fin au lieu de celle du début ;
  - `dateAVerifier` ;
  - l'ajout du début aux clôtures ;
  - les erreurs `source_invalide` et `releve_invalide` ;
  - la recopie de `source` et de `releveLe`.
- Aucune date légale n'est inventée : les délais des tests sont fictifs (domaine `exemple.invalid`). Aucun secret, aucun prix, aucun mot interdit. Journal de 7 lignes.

## Défauts (fiche contredite par le code)
1. `packages/noyau/src/alertes/calendrier.ts:101` (`echeancesSociete`) : les types ancrés sur `creation` ou `periode` disparaissent sans signal. `ancres` ne contient ni `creation` ni `finsDePeriode`, donc `echeancesDe` ne produit rien pour eux.
   Une échéance légale du catalogue peut ainsi manquer au calendrier de la société, sans erreur et sans mention « à vérifier ». Cela contredit la règle CA-R1 de `calendrier.ts` (« paramètre non validé rendu à vérifier ») et le piège de la fiche. Le journal note cette limite, mais le code ne la rend pas visible.
   Correction : pour un type retenu par le profil dont l'ancrage est `creation` ou `periode`, lève `ErreurCatalogue('ancrage_non_gere')`. Une autre solution est de rendre la liste de ces codes à part. Ajoute le test correspondant dans `calendrier-releve.test.ts`.
2. `calendrier.ts:102` : une échéance qui a `releveLe` mais pas de `source` sort avec `dateAVerifier: false`. La fiche dit « chaque échéance porte sa source et sa date de relevé ». Une date sans source ne doit pas être présentée comme vérifiée.
   Correction : `dateAVerifier: true` quand `source` ou `releveLe` est absent. Ajoute le cas « releveLe sans source → à vérifier » dans `sans-releve-a-verifier` ou dans `chaque-date-a-source-et-releve`.

## Remarques (à trancher par Will, non bloquantes)
- La fiche dit « `releveLe` obligatoire sur chaque entrée ». Le code le rend facultatif, et son absence donne « à vérifier ». Aucun catalogue de données n'existe sur main (`TypeEcheance` est passé en argument), donc c'est acceptable, mais la fiche doit être alignée.
- Ancrage `annee_civile` : seule l'année civile de la fin est retenue. Pour une année de dix-huit mois (01/2026 à 06/2027), l'année civile 2026 ne produit aucune échéance. Il faut confirmer que c'est voulu, sinon c'est une omission du même type que le défaut 1.
- La fiche dit « ancrées sur début et fin ». Le début n'est que validé, pas utilisé comme ancre (cf. journal).
- Fiche sensible : fusion par Will seul.
