VERDICT: OK
SHA relu : 486141ef680a30a0dd1b958db1886cb59e550152

# Avis de relecture, PR 943 (fiche L07-T27), branche lot-07/L07-T27

## Contrôles faits
- Fichiers modifiés : les 8 font partie des `fichiers_autorises`. `Coque.tsx` gagne une ligne de montage et une ligne d'import, ce qui respecte le piège de la fiche. `coque.test.tsx` n'est pas modifié. `.github/` et les gardes ne sont pas touchés. Aucune dépendance n'est ajoutée.
- Taille : 209 lignes ajoutées et 1 supprimée, soit 210 pour 280 au plus (aucune ligne « - - »).
- Tests : `bandeau-acces.test.tsx`, `liens.test.ts` et `coque.test.tsx` passent en entier (20 sur 20). Les tests existants de la coque restent verts.
- Mutations, toutes annulées ensuite :
  - gravité `attention` limitée à SUSPENDU → `gravite-attention-pour-suspendu-et-resilie` rougit ;
  - contrôle `https:` retiré dans `liens.ts` → `lien-portail-https-seulement` rougit ;
  - résumé de reprise jamais affiché → `resume-de-reprise-affiche` rougit.
- `node scripts/verifier.mjs` (Node 22, `npm_config_engine_strict=false`) : les 24 étapes sont vertes.
- Règle 13 (CONSIGNE-AUTEUR3) : l'adresse du portail n'est lue que dans `VITE_URL_PORTAIL`, et vaut `null` sans elle. Les tests utilisent `https://portail.exemple.invalid`. Aucune adresse réelle, aucun secret. Chemins marqués « à confirmer (D29) ».
- Journal : 7 lignes, il commence par `# Journal L07-T27`. Aucun prix ni mot interdit. Aucun texte d'état en dur dans le `.tsx`.

## Remarques (non bloquantes)
- `bandeau-acces.test.tsx:114-124` (`lien-du-portail-seulement-si-variable-https`) ne vérifie pas le `href`. Le libellé du lien s'affiche dans tous les cas, donc le test passe même si `href` vaut toujours `null`. Mutation essayée : `href: null` à `BandeauAcces.tsx:16`, aucun test ne rougit. Aujourd'hui, le service d'accès appelle `contenuBanniere(..., false)` et ne renvoie que `contacter_axion` : le cas `portail_abonnement` ne peut pas encore arriver, d'où une remarque seulement. Avant le branchement de la console, ajouter un test qui fait renvoyer `portail_abonnement` et exige `href === 'https://portail.exemple.invalid/abonnement'`.
- Le test nommé `coque-existante-inchangee` n'existe pas sous ce nom. Le critère est rempli par `coque.test.tsx`, qui n'est pas modifié et reste vert.
- La fiche cite `ReponseAcces`, mais le code lit `Acces` : c'est le seul schéma que le contrat exporte pour `/acces`. Pas de risque.
