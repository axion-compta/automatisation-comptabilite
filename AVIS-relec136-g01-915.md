VERDICT: OK
SHA relu : ae7a98174e6222dcb97ab317728af78e6504981c

# Avis de relecture, PR 915 (fiche L04-T52, sensible), branche lot-04/L04-T52

## Défauts des anciens avis (relec121 sur ec6c563, relec127 sur 7649834)
1. Antivirus indéterminé, pièce coincée ou boucle sans fin : corrigé. `files.ts:100-108` repasse une pièce `en_erreur` en `quarantaine` par `appliquerTransition`, en gardant `tentatives` et en retirant `prochaineRelanceA`, puis l'enregistre avant un nouveau contrôle. Le test `branchement-antivirus` couvre ces cas :
   - indéterminé → `reporte`, tentatives 1 ;
   - indéterminé → `reporte`, tentatives 2 ;
   - indéterminé → `fait`, tentatives 3 avec `prochaineRelanceA: 'abandon'` enregistré, et rien dans la file de préparation ;
   - puis sain → `quarantaine`, publiée en préparation.
2. Préparation en erreur, pièce perdue : la correction est toujours là (`files.ts:114-121`). La pièce passe `en_erreur`, la relance suit `prochaineRelance` et l'abandon n'arrive qu'après le dernier délai, avec l'état enregistré. Le branchement de chaque exécuteur (entrée, préparation, lecture, classement) est testé.
3. `types` rouge (triplets `couleur`) : corrigé avec `as [number, number, number]`.
4. Taille : 287 lignes (135+142+1+9), pour 300 dans la fiche et moins de 400 dans le dépôt.

## Contrôles
- CI du SHA relu : les 9 jobs sont verts (gardes, types, lint, tests, verifier, stryker, e2e, gitleaks, licences). En local, `node scripts/verifier.mjs --gardes` est vert.
- Fichiers : les 4 `fichiers_autorises` seulement, sans `.github/`, sans garde et sans dépendance.
- Tests : 12 sur 12 passent (`files.test.ts`). Mutations, annulées ensuite, qui font toutes rougir un test :
  - plus de retour en quarantaine ;
  - `prochaineRelanceA` gardé ;
  - pièce non enregistrée avant le nouveau contrôle ;
  - `abandon` traité comme une relance ;
  - préparation en erreur terminée sans relance.
- Règle 13 : prise `ServiceFiles` et faux service `FilesMemoire`. Aucune adresse, aucun port, aucun secret, rien en production.
- Aucun mot interdit, aucun prix, données fictives. Journal : 9 lignes, il commence par `# Journal L04-T52`.

## Remarques (non bloquantes)
- `files.test.ts` : pour tenir sous le plafond, 16 lignes dépassent 200 caractères et enchaînent plusieurs `expect` sur la même ligne. La lecture et le diagnostic d'un échec en souffrent. À aérer quand une fiche le permettra.
- `etape-entree.ts:81` (hors PR) : `controle_impossible` (original illisible au stockage) met la pièce `en_erreur` sans `prochaineRelanceA`. L'exécuteur rend alors `{ fin: true }` sans relance. L'état est enregistré, donc la pièce n'est pas perdue en silence, mais elle n'est jamais relancée.
- Après une relance réussie, le `code: 'indetermine'` d'avant reste sur la pièce.
- Le journal dit encore « Tests : 8 passent », alors qu'il y en a 12.
- Les remarques d'avant restent valables : panne rendue sans délai, IA indisponible relancée sans plafond, IMP-031 hors périmètre, critère T-LEC-26 « vraies files » en attente du service de la console.

Fiche sensible : la fusion revient à Will seul.
