VERDICT: OK
1208927caa834ac43faefc2e7638202046a94161

# Avis L24-T29 (PR n°1179), relecteur Opus

Fiche `sensible: oui` : fusion par Will seul.

- Périmètre : 6 fichiers, tous dans `fichiers_autorises` ; 119 ajouts / 12 suppressions (max 200).
- Tests nommés présents (4/4) ; 30 tests passent en local (`regles.test.ts`, `purge-proposee.test.ts`).
- CI verte (gardes compris).
- Aucune durée existante modifiée ; aucune durée nouvelle (les catégories dérivées copient la règle `pieces` du même pays).
- Aucun mot interdit, aucun secret, aucun prix ; données fictives.
- Mutations tuées (11/11) : garde `gel_actif` retirée, condition `origine === 'console'` retirée, `estCategorieComptable` retiré, `rapprochements` ou `releves_bancaires` retiré de `CATEGORIES_COMPTABLES`, test `x.pays === r.pays` retiré, filtre `pieces` retiré, statut ou point de départ forcés, ordre de concaténation inversé, compteur `conservation_comptable` à 0.

## Remarques (non bloquantes)
- `apps/serveur/src/rgpd/effacement-console.ts` n'envoie pas encore `origine: 'console'` (hors périmètre, signalé dans la PR) ; sans elle, la ligne comptable reste gardée avec `trop_tot`, donc sans effet sur les données comptables. Une fiche de raccordement serait utile.
- `etendreReglesBancaires` n'est appelée par aucun code de production : les règles sont injectées, les relevés et rapprochements restent en `aucune_regle` (donc gardés) tant que l'appelant ne l'utilise pas.
- Pour une ligne comptable venant de la console, le code `a_confirmer` est remplacé par `conservation_comptable` : l'information « règle à vérifier » se perd dans le résumé.
