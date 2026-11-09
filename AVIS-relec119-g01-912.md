VERDICT: OK
PR: 912
Fiche: L05-T56
Branche: lot-05/L05-T56
SHA relu: 220baca2f587e36ff63aff2c9d2381b264afa37a

## Vérifications
- Fichiers modifiés : les 5 `fichiers_autorises`, rien d'autre. 284 lignes (max 300), aucune ligne binaire.
- Migration `apps/serveur/src/base/migrations/081-chat.sql` : ajout seul, `IF NOT EXISTS` partout. Ni DROP, ni RENAME, ni DELETE, ni TRUNCATE, ni déclencheur, ni EXECUTE. `societe_id` est présent dans les 5 tables, `parent_id` dans `message`. La migration n'est exécutée contre aucune base : la garde `migrations` la lit comme texte.
- `depot.ts` : interface `DepotChat` et adaptateur d'essai en mémoire. Aucune adresse, aucun port, aucun identifiant ni secret.
- Tests nommés présents : `conversation-liee-a-une-societe`, `branches-par-parent`, `preference-oubliee-non-utilisee`, `application-atomique`, `migrer-deux-fois`, `aucun-delete-dans-la-migration`. Vitest : 9/9 verts.
- Mutations sur `depot.ts` (chacune rougit un test, puis annulée) :
  - retour arrière des étapes supprimé dans `appliquerAtomique` ;
  - filtre `!p.oubliee` retiré ;
  - contrôle de l'état `proposee` retiré ;
  - filtre `societeId` retiré dans `enfants`.
- `tsc --noEmit` et eslint : verts. Gardes perimetre, migrations, textes, fictif, litteraux, portes, tests, termine, fiches : vertes.
- Journal : 7 lignes, titré `# Journal L05-T56`. Données fictives. Aucun prix, aucun mot interdit.

## Remarques (non bloquantes)
- `depot.ts` (`ajouterMessage`) : un parent pris dans une autre conversation lève `autre_societe`. Le nom de ce code induit en erreur, et aucun test ne couvre ce cas. De même, la clé étrangère `(societe_id, parent_id)` de la migration n'impose pas que le parent soit dans la même conversation. À couvrir quand l'adaptateur SQL arrivera, par exemple avec une contrainte `(societe_id, conversation_id, parent_id)`.
- Les critères « tests sur une base de test » et « migrer appliqué deux fois » ne sont vérifiés que sur le texte (`IF NOT EXISTS`, garde des migrations). C'est voulu (rien contre une vraie base), mais il faudra les rejouer sur une base d'essai le moment venu.
- Les services en mémoire de L05-T38 et L05-T39 n'utilisent pas encore `DepotChat`, car leurs fichiers ne sont pas autorisés ici. Le branchement reste à faire dans une autre fiche.
