VERDICT: OK

PR #1171 (L20-T22), seconde relecture. Tête relue : 032cc3c3d185066e2ee04b8ea03c4a2b3197a097
Relecteur Opus, consigne LOT5 section R. Avis précédent : A CORRIGER à la tête e520d83ffbc898acf7590df7ea00a86c64c6addd.

## Défauts précédents : levés (vérifié par mutation)
1. `packages/noyau/src/exercices/dates-modifiables.ts:11` : `dates-par-defaut` accepte 1000 et 9999 et refuse NaN, ±Infinity, 2026.5, 999, 10000, -2026 et 0. Mutations rejouées, chacune fait rougir 1 test : retrait de `!Number.isInteger(annee) ||`, de `annee < 1000 ||`, de `|| annee > 9999`.
2. `packages/textes/src/moteur/exercices.ts:2` : 12026, -2026 et 2026.5 sont refusés. Retirer `^` (ou `$`) de `/^\d{4}$/` fait rougir 1 test.

## Aucune régression
- 6 fichiers, tous dans `fichiers_autorises` ; 95 lignes ajoutées et 1 supprimée (96, maximum 140).
- Tests ciblés : 6/6. Mutation supplémentaire `nbEcrituresValidees !== 0` → `< 0` : 1 test rouge.
- Journal de 8 lignes. Aucun secret, aucun prix, aucun mot interdit.

## Remarques
- CI : `tests` et `verifier` sont rouges à cause du seul test `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`), qui échoue aussi sur `origin/main` (347401ab, reproduit en local). La PR ne touche pas ces fichiers : ce n'est pas un défaut de l'auteur. La fusion attend la correction sur main.
- Inchangées, hors périmètre : `PHRASE_DATES_MODIFIABLES` copiée dans noyau et textes sans test d'égalité ; `changerDateCloture` pas encore reliée à `datesModifiables` (fiche dédiée).
