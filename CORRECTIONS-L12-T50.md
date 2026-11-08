VERDICT: A CORRIGER
SHA relu : 217fc52910f7486adbe447b5484c96a0a47259f5

# Avis L12-T50 (PR #851, fiche sensible, relecture renforcée)

## Contrôles faits
- Périmètre : 4 fichiers modifiés, tous dans `fichiers_autorises`. Taille : 191 lignes ajoutées et 2 retirées, sous le plafond de 300. Aucune ligne « - - ».
- Les tests `CT-02 http`, `CT-43 http` et `aucun-b-action-faite` sont présents, ainsi que des cas limites : règle M ou non bloquante pour l'action, règle inactive, règle qui plante (IMPOSSIBLE donc refus), catalogue vide, bornes de période, période absente ou inversée. Les 7 tests passent.
- `scripts/verifier.mjs` : tout au vert (24 étapes). La CI de la PR est au vert.
- Mutations faites à la main puis annulées : plus d'ajout du déclencheur aux règles (3 tests rouges) ; `reglesAJouer` utilisé pour toutes les actions (2 rouges) ; mise en cache des traces entre deux appels (4 rouges, CT-43 tenu) ; mauvais déclencheur pour la TVA (2 rouges).
- Le résultat n'est jamais réutilisé : les traces sont recalculées à chaque appel. La règle la plus stricte est retenue : à la clôture et à la validation, toutes les règles actives sont jouées, quel que soit leur déclencheur d'origine.
- Pas de secret, de SIREN, d'IBAN, de prix ni de mot interdit. Données fictives. Pas de nouvelle dépendance (`fastify` était déjà dans apps/serveur).

## Défauts (bloquants)
1. pilotage/fiches/L12-T50.md:19-20 : la PR supprime tout le paragraphe « Contexte », alors qu'il fallait retirer seulement la mention `bloque_par`. Le passage supprimé contenait aussi l'exigence de la spec : « Spec 12 : avant chacune des quatre actions, rejouer le catalogue (sans cache pour l'export) puis refuser avec 409 si un B est ouvert. » La section « Contexte » est maintenant vide, et l'exigence « sans cache pour l'export » n'est plus écrite dans la fiche. Correction demandée : remettre cette phrase de la spec (ainsi que la mention de J3a au besoin) et ne retirer que le blocage.

## Remarques (non bloquantes)
- Test, lignes 41-55 : CT-02 et CT-43 « en HTTP » passent par quatre routes d'essai Fastify, pas par les vraies routes d'export du FEC, de TVA et de clôture. Ces routes n'existent pas encore : leur contrat est hors périmètre de L03-T54, et L03-T53 n'est pas fusionnée. Les critères sont donc tenus sur un faux serveur, ce que permet J3a. Le branchement réel reste à faire : le journal devrait nommer une fiche de suite (« brancher creerAvantAction sur les routes réelles »).
- avant-action.ts:36 : pour `exporter` et `cloturer`, `reglesAJouer` n'est pas utilisé, alors que la fiche le demande (elle cite `reglesAJouer`). C'est plus strict que L12-T23, mais il faut le dire dans le journal pour qu'un relecteur ne « corrige » pas plus tard en revenant à `reglesAJouer`.
- avant-action.ts:44-48 : une période absente ou invalide pour `valider_mois` ou `preparer_tva` lève `ErreurDeclencheur`, qui deviendra un 500 dans une route. Il faudrait la traduire en 400 ou 422 dans la fiche de branchement. Le cas `val
