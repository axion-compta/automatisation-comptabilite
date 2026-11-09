VERDICT: A CORRIGER
SHA relu : 1089d536397ba51aa51a5375505ba9a93c9b0fb8

Relecture de la PR #923 (fiche L03-T45, sensible: non, branche lot-03/L03-T45).

Défaut bloquant
1. apps/web/src/ecrans/e19/Declaration.tsx:41 : dans « D'où vient ce montant ? », chaque écriture source reçoit `montant: c.montantCentimes`, c'est-à-dire le montant total de la case. Avec plusieurs sources, l'écran affiche donc un faux montant pour chaque écriture. Le test `provenance-liste-les-ecritures` en donne l'exemple : une case de 15,00 € a deux écritures qui affichent chacune 15,00 €, soit 30,00 € en apparence. Sur une déclaration de TVA, l'utilisateur est induit en erreur sur l'origine du montant. Le contrat ne fournit pas le montant par source et `Provenance` exige un montant : le montant par écriture ne peut donc pas être affiché correctement dans le périmètre de cette fiche. Correction demandée : ne pas inventer de montant par écriture. Il faut passer la fiche en `bloque` en signalant ce manque (montant par ligne source dans le contrat, ou montant facultatif dans `Provenance`) ou obtenir une décision qui élargit le périmètre. Il faut aussi ajouter un test qui échoue si une écriture affiche le montant de la case alors qu'elle en a plusieurs.

Vérifié
- Fichiers modifiés : tous dans `fichiers_autorises` (6 fichiers) ; aucun texte de L03-T44 supprimé dans `e19.ts`.
- Taille : 228 + 4 = 232 lignes, sous la limite de 300 de la fiche ; aucune ligne « - - ».
- Règle 13 (auteur3) : aucune adresse ni secret ; le faux serveur passe par `demarrerNoeud` ; noms fictifs (« Camille Exemple », codes de case X01/X02) ; rien en production, aucune action d'écriture.
- Les 6 tests nommés sont présents ; les cas limites « néant » (aucune case non nulle) et « source sans libellé » sont couverts. Vitest e19 : 13/13 verts.
- Mutations (toutes rougissent) : IMPOSSIBLE affiché comme réussi, cases à zéro non filtrées, filigrane forcé à `aucun`, bouton retour inopérant.
- `pnpm verifier` : vert (types, lint, 698 fichiers de test, gardes).
- Aucun prix, aucun mot interdit, aucun texte en dur ; journal de 7 lignes commençant par `# Journal L03-T45`.

Remarques (non bloquantes)
- Declaration.tsx:19 : `idDeclaration` déduit l'identifiant de la déclaration de celui de la période (PERxxx → DECxxx), selon la convention du jeu fictif. Le contrat ne relie pas la période à sa déclaration ; avec de vraies données, on obtiendra un 404 (état d'erreur). Il faut le signaler pour une fiche de contrat.
- Le contrat n'a pas de statut `preparee` : le bouton apparaît pour `validee` et `deposee_par_client`, ce qui est cohérent avec le journal.
- `provenance-liste-les-ecritures` se termine par un `await monter()` sans assertion : c'est inutile.
