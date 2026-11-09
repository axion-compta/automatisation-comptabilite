VERDICT: A CORRIGER

PR : 915 (fiche L04-T52, sensible)
SHA relu : ec6c563d948e7d36d6442dc816d2eae8084c36d7

## Contrôles
- Fichiers modifiés : les 4 `fichiers_autorises` seulement. Taille : 249 lignes (max 300 dans la fiche, moins de 400).
- Gardes (`node scripts/verifier.mjs --gardes`) : toutes vertes. Journal : 7 lignes, il commence par `# Journal L04-T52`.
- Tests : 8/8 passent. Les 5 tests nommés existent. Les mutations sur le tri par priorité, le rang `gros_documents`, le seuil `>`/`>=`, la déduplication de `publier` et le `rendre` en cas de panne font toutes rougir au moins un test.
- Règle 13 : prise `ServiceFiles` + faux service `FilesMemoire`. Aucune adresse, aucun port, aucun secret, rien en production. Données fictives. Aucun mot interdit, aucun prix.
- Critère « T-LEC-26 rejoué sur les vraies files » : impossible à lancer pour l'instant (pas de service console). Le journal le signale.

## Défauts
1. `apps/serveur/src/pieces/adaptateurs/files.ts:110` : si `etapePreparation` rend `en_erreur`, l'exécuteur renvoie `{ fin: true }`. La tâche est terminée sans relance et la pièce reste à l'état `quarantaine`, sans aucune tâche dans aucune file. La pièce est donc perdue sans bruit, ce qui contredit le critère « 0 perte ». Correction : passer la pièce en `en_erreur` et renvoyer `{ relanceA }` d'après `prochaineRelance` (L04-T28), comme le fait déjà l'antivirus. N'abandonner qu'après `abandon`, avec l'état enregistré.
2. `apps/serveur/src/pieces/adaptateurs/__tests__/files.test.ts` : l'étape 1 de la fiche (le branchement) n'est testée que pour `executeurAntivirus`. `executeurEntree`, `executeurPreparation`, `executeurLecture` et `executeurClassement` ne sont jamais appelés. Deux mutations ne font rougir aucun test : supprimer la ligne 110 (`prep.etat === 'en_erreur'`) et remplacer `'abandon'` à la ligne 103. Correction : ajouter un test par exécuteur, au moins le chemin nominal, le rejeu journalisé (`faits`/`lectures` déjà écrits) et le chemin d'erreur ou d'abandon.

## Remarques (non bloquantes)
- `traiterUne` : une panne rend la tâche aussitôt (`dispoA` vide), sans délai ni plafond. Une tâche qui échoue toujours tourne donc en boucle. Il faudra prévoir un plafond ou un délai quand le vrai service sera branché.
- `executeurLecture` relance à l'infini quand l'IA est indisponible. La file « en attente de quota » (V3-IMP-031, exigence citée dans la PR) est déclarée hors périmètre dans le journal. Il faut la retirer des exigences de la PR ou ouvrir une fiche.
