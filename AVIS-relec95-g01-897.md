VERDICT: OK
SHA relu: 77d41b161c45652b353fbe565057f79065403015

# Avis relec95-g01-897 : PR 897, modification de la fiche L11-T27 (sensible)

Branche `pilotage/L11-T27-geste`, un seul commit, un seul fichier : `pilotage/fiches/L11-T27.md` (+3 / -3).

## Vérifications
- Diff : seuls `fichiers_autorises` (ajout de `packages/contrat/src/gestes-routes.ts`), `taille_max_lignes` (340 -> 345) et le point 3 de « À faire » changent. Aucun autre champ (statut, sensible, exigences, depend_de, criteres, tests nommés, hors périmètre, pièges) n'est touché.
- Sur main : `ROUTES_A_GESTE` est bien vide (`packages/contrat/src/gestes-routes.ts:3`) ; `VERBES_SENSIBLES` commence par `valider` ; `CATALOGUE_GESTES` (`packages/noyau/src/principes/gestes.ts:14`) a `G01` = `valider_ecriture`, permission `compta-valider`, réauthentification `jamais`.
- Blocage réel : `validerFrais` commence par `valider`, donc `contrat-actuel-vert` (`packages/contrat/src/__tests__/gestes-routes.test.ts:33-38`) rougirait sans entrée dans la carte. La fiche n'autorisait pas ce fichier : l'ajout est nécessaire et suffisant.
- Choix de G01 : cohérent. `validerFrais` appelle `demanderValidation` (L01-T07) sur les écritures proposées par `proposerFrais` : c'est la validation d'écritures (spec 13, R15, « G01 valider une écriture », cité par L13-T02). La permission `compta-valider` est celle que L11-T38 réserve à « validation, remboursement ». Aucun autre code ne convient (G02 clôture, G03/G04 déclarations, G10 e-mail…). Je n'y vois pas de décision de produit ouverte ; la fiche étant sensible, Will confirme de toute façon à la fusion.
- Aucune garde affaiblie : le point 3 interdit explicitement de retirer une entrée, un verbe de `VERBES_SENSIBLES` ou une assertion ; `gestes-routes.test.ts` n'est pas dans les fichiers autorisés et n'a pas à changer (le test `contrat-actuel-vert` accepte la nouvelle entrée telle quelle).
- Effets de bord : la garde `creerGardeGestes` (`apps/serveur/src/principes/garde-gestes.ts:52`) prend `ROUTES_A_GESTE` par défaut mais n'est branchée sur aucune route et ses tests utilisent une carte forgée ; `outil-change.test.ts` (`zero-geste`) ne vise pas `validerFrais`. Les autres operationId de la fiche (`proposerFrais`, `preparerRemboursement`) ne commencent par aucun verbe sensible (`proposerdividende` n'est pas un préfixe de `proposerfrais`).
- `node outils/gardes/fiches.mjs` sur le SHA relu : vert (891 fiches cohérentes, 401 avertissements, même compte que main ; L11-T27 et L14-T39 partageaient déjà `openapi.json`).
- Aucun mot interdit, aucun prix, aucune donnée réelle dans le diff.

## Remarques (non bloquantes)
1. Conflit de fusion prévisible avec L14-T39 (lot 14, `a_faire`), qui ajoute `validerRapport: 'G02'` dans la même carte : les deux fiches réécrivent la ligne `= {};`. Pas de dépendance à imposer (lots différents, la garde ne fait qu'avertir) ; la seconde branche fusionnée se remet à jour et garde les deux entrées. Ajouter `gestes-routes.ts` à la liste des fichiers communs des « Pièges » serait utile, sans être nécessaire : le point 3 suffit à l'auteur.
2. La marge de +5 lignes couvre l'entrée (1 à 3 lignes selon la mise en forme) ; suffisant.
