VERDICT: A CORRIGER

PR n°1141, tête relue : f72f8acddf11de2dbefb8250fcbb92387ad81c9b

## Défauts
1. apps/serveur/src/exports/zip-exercice.ts:39-43 : le commentaire (et le journal, ligne 3) dit « un contenu différent ne reprend jamais d'anciennes parties », mais la signature du suivi ne prend que les rayons, les noms, chemins et tailles du plan, pas le contenu. Reproduit avec un test jetable : export d'un fichier « montant 100 », puis même fichier passé à « montant 900 » (même taille), second export avec le même dépôt et le même suivi : la partie ancienne est reprise et le ZIP contient toujours « montant 100 ». Un export refait après une correction de même longueur rend donc un ZIP périmé. Correction demandée : faire entrer le contenu dans la signature (par exemple l'empreinte de chaque fichier lu, ou une empreinte/date de version fournie par `SourceExercice.lister`), ou bien limiter la reprise à une même exécution interrompue ; puis corriger le commentaire et le journal pour dire exactement ce que le code assure réellement.
2. apps/serveur/src/exports/__tests__/zip-exercice.test.ts : mutations survivantes, vérifiées : retirer le plan de la signature (ligne 40), retirer les rayons de la signature, ou supprimer le contrôle final `verifierParties` (ligne 62) laisse les 6 tests verts. Correction demandée : un test où le même suivi sert à deux exports aux rayons différents puis au contenu changé (même taille) et qui exige une partie refaite ; un test où le contrôle final échoue (par exemple dépôt qui altère les octets) et qui attend `controle_absent`.

## Vérifié
- Fichiers modifiés tous dans `fichiers_autorises` ; diff 219 lignes (max 220) ; journal 6 lignes, commence par `# Journal L20-T11`.
- Tests ciblés : 6/6 verts. Mutations qui rougissent : rayons vides acceptés, filtre exercice, filtre rayon, relecture d'empreinte.
- Taille 0, négative, NaN refusées (par `decouper`) ; segments `../x` et `a/b` refusés.
- Aucun secret, aucun prix, aucun mot interdit, données fictives. CI verte à la tête.
