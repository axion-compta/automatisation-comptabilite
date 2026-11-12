VERDICT: OK

PR #1168 (L22-T01, code), seconde relecture. Tête relue : a62c61f4a29ad7d83d45988bb0caabb9765d98c9
Relecteur Opus, consigne LOT5 section R. Avis précédent : A CORRIGER à la tête 44500b3d1073dc7ba891ee2757030f009b64a3b3.

## Défauts précédents : levés (vérifié par mutation)
1. `franchise-mention.ts:65` : `source_a_verifier` vient maintenant des seules mentions trouvées. Nouveau test `tolerance-a-verifier-gardee-si-cibs-valide` (2027-02-15, tolérance CGI `a_verifier`, CIBS `valide`). Mutations rejouées : `trouvees.every` → `admises.every` fait rougir 2 tests ; `every` → `some` fait rougir 1 test.
2. `references.ts:37` : cas `valide` avant la bascule ajouté dans `statut-repris-de-la-ligne`. Mutation `statut: ligne.statut` → `'a_verifier'` dans la branche CGI : 1 test rouge.

## Aucune régression
- 10 fichiers, tous dans `fichiers_autorises` ; 236 lignes ajoutées et 8 supprimées (244, maximum 250).
- Tests ciblés : 35/35 (is-societes, cgi-cibs, references, franchise-mention).
- Changement d'attente dans `absente` (cas `mixte` : ANCIENNE à vérifier lue → `OK` + `source_a_verifier`) : cohérent avec la correction demandée, aucun test retiré, deux cas ajoutés.
- Journal de 8 lignes, commence par `# Journal L22-T01`. Aucun secret, aucun prix, aucun mot interdit, données fictives.

## Remarques
- CI : `tests` et `verifier` sont rouges à cause du seul test `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`). Il échoue aussi sur `origin/main` (347401ab, reproduit en local) et la PR ne touche pas ces fichiers : ce n'est pas un défaut de l'auteur. À corriger dans une fiche dédiée avant la fusion.
- Inchangé : la fiche demande des tests de CC-T13 « sur le VRAI catalogue », impossible sans dépendance de `@axion/noyau` vers `@axion/parametres` (défaut de fiche, pour Will).
- Fiche sensible : fusion par Will seul.
