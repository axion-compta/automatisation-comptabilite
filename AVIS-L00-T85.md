VERDICT: A CORRIGER
52b8cf54b446cb563e20375e127c6ce1485f9a06

# Avis L00-T85, PR #1061 (seconde relecture, relecteur Opus, lot 5 section R, 11/11/2026)

SHA de tête relu : 52b8cf54b446cb563e20375e127c6ce1485f9a06. L'avis précédent portait sur le SHA b7e18a36.
La PR est sensible (`pilotage/`) : la fusion revient à Will seul.

## Ce qui a changé depuis b7e18a36
- Deux fusions de `main`, sans rebase ni force-push. La seconde apporte #1060 : la fiche L00-T85 est maintenant sur `main`.
- Le contenu propre à la PR est inchangé : 6 fiches et le journal sont identiques à b7e18a36.
- #1049 et #1050 (L00-T84) sont **toujours ouvertes**.

## Défaut 1 de l'avis précédent : NON CORRIGÉ (bloqué par l'ordre de fusion)
- `pilotage/fiches/L09-T54.md:10` : `depend_de` vaut toujours `["L09-T37", "L09-T49"]`.
- Reproduit au SHA de tête, en fusionnant localement cette branche avec `lot-00/L00-T84`. `node outils/gardes/fiches.mjs` sort en code 1 avec ce message : `garde:fiches : L09-T52 et L09-T54 (même lot) partagent packages/contrat/src/domaines/profil-champs.ts, packages/contrat/src/domaines/profil-champs-service.ts sans dépendance entre elles`.
- Mutation : avec `depend_de: ["L09-T37", "L09-T49", "L09-T52"]`, `fiches.mjs` est vert (1004 fiches), et `termine.mjs` aussi.
- Le correcteur a raison : la correction n'est pas possible tant que L09-T52 n'existe pas sur `main` (« dépendance L09-T52 inconnue »). Ce n'est pas une faute de l'auteur, mais **la PR ne doit pas être fusionnée en l'état**.
- Correction demandée, inchangée : une fois #1050 fusionnée, faire `git merge origin/main` sur `lot-00/L00-T85`, puis ajouter `L09-T52` au `depend_de` de L09-T54, puis relancer `node outils/gardes/fiches.mjs`.
- Si #1061 était fusionnée avant #1050, c'est #1050 qui deviendrait rouge. Dans ce cas, L09-T54.md devrait être ajouté à ses `fichiers_autorises`, ce qui est la décision de Will. L'ordre recommandé reste donc #1049, #1050, puis #1061.

## Contrôles relancés au SHA de tête
- `node outils/gardes/fiches.mjs` sur la branche seule : vert (1001 fiches). `perimetre.mjs` : vert.
- CI : toutes les vérifications sont vertes (gardes, verifier, tests, lint, types, e2e, gitleaks, licences, stryker). L'étape `garde:perimetre`, rouge lors de l'avis précédent, est passée au vert depuis la fusion de #1060.
- Fichiers : 7, tous dans `fichiers_autorises`.
- Aucun mot interdit, aucun prix, aucun secret, aucun nom réel.

## Remarques (non bloquantes, reprises de l'avis précédent)
- La fiche L00-T85, maintenant sur `main`, ne cite pas `L00-T84` dans `depend_de`, alors que l'ordre de fusion en dépend. Si elle l'y ajoutait, l'ordre serait vérifié par les gardes.
- Les autres remarques de l'avis précédent tiennent toujours : C04/C02 sans fiche qui les branche, exceptions permanentes de `domaines-sans-prefixe.ts`, et chemins `/profil/champs/{cle}` sans préfixe.
