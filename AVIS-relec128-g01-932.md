VERDICT: OK
SHA relu : 659e4b658dd009871cad9270e27eed1466d1cd6a
PR 932, fiche L15-T42 (non sensible), branche lot-15/L15-T42.

## Contrôles
- Fichiers modifiés : les 5 de `fichiers_autorises`. `handlers.ts` et `contrat-commun.test.ts` ne sont pas touchés.
- Taille : 200 lignes ajoutées et 7 retirées (plafond : 300). Aucune ligne « - - ».
- Journal : 6 lignes, commence par « # Journal L15-T42 ».
- Tests : la suite commune passe sur le vrai serveur et sur le faux, et le `it.todo` est remplacé. Résultat de alertes-actions.test.ts et contrat-commun.test.ts : 318 tests passent, 2 restent en todo (ceux d'autres domaines).
- Gardes vertes. `tsc --noEmit` passe sur faux-serveur.
- Les lectures et les écritures passent par le même service : une alerte reportée sort bien des compteurs (testé).
- Les pannes `x-panne` 403, 409 (avec `versionActuelle`) et 423 sont testées sur les trois routes.
- Aucun secret. `http://exemple.fr` sert seulement de base fictive à MSW dans le test. Aucun prix, aucun mot interdit.
- Mutations : 4 sur 5 rougissent (panne ignorée, service séparé pour l'écriture, statut de `report_interdit`, `versionActuelle` de la panne 409).

## Remarques (non bloquantes)
- Une mutation survit : retirer le contrôle `Number.isInteger(version)` ne fait rougir aucun test. Un cas avec `version: "1"` qui attend 400 le couvrirait.
- `report-apres-echeance-422` n'est pas dans la suite commune : il faut injecter les échéances, comme le journal l'explique. Le cas reste couvert par les tests du service.
- Un code d'erreur inconnu reçoit 409 par défaut (`STATUTS[e.code] ?? 409`). Un 500 serait plus prudent ; ce n'est pas bloquant pour un faux serveur.
