VERDICT: A CORRIGER
53c8fbc24713bac5581ced0336e8108186a62299

# Avis L00-T85, PR #1061 (troisième relecture, relecteur Opus, lot 5 section R, 12/11/2026)

SHA de tête relu : 53c8fbc24713bac5581ced0336e8108186a62299. L'avis précédent portait sur le SHA 52b8cf54.
La PR est sensible (`pilotage/`) : la fusion revient à Will seul.

## Ce qui a changé depuis 52b8cf54
- Une fusion de `main`, sans rebase ni force-push. Elle apporte #1049 (L00-T84, fiche seule), #1062 et #1064.
- Le contenu propre à la PR est inchangé : 7 fichiers, identiques.
- #1050 (L00-T84, fiches) est **toujours ouverte** : `pilotage/fiches/L09-T52.md` n'existe pas sur `main`.

## Défaut 1 de l'avis précédent : NON CORRIGÉ (toujours bloqué par l'ordre de fusion)
- `pilotage/fiches/L09-T54.md:10` : `depend_de` vaut toujours `["L09-T37", "L09-T49"]`.
- Reproduit au SHA de tête : fusion locale avec la tête de #1050 (87f259d2). `node outils/gardes/fiches.mjs` sort en code 1 : `garde:fiches : L09-T52 et L09-T54 (même lot) partagent packages/contrat/src/domaines/profil-champs.ts, packages/contrat/src/domaines/profil-champs-service.ts sans dépendance entre elles`.
- Ce n'est pas une faute de l'auteur : L09-T52 est encore inconnue de `main`. Mais **la PR ne doit pas être fusionnée en l'état**.
- Correction demandée, inchangée : une fois #1050 fusionnée, `git merge origin/main` sur `lot-00/L00-T85`, ajouter `L09-T52` au `depend_de` de L09-T54, relancer `node outils/gardes/fiches.mjs`.
- Ordre recommandé : #1050, puis #1061. Si Will préfère fusionner #1061 d'abord, L09-T54.md doit entrer dans les `fichiers_autorises` de L00-T84 : décision de Will.
- Note : la fusion locale avec #1050 donne aussi un conflit sur `pilotage/fiches/L00-T84.md`. Il vient de #1050 (sa fiche est déjà sur `main` par #1049), pas de cette PR.

## Contrôles relancés au SHA de tête
- `node outils/gardes/fiches.mjs` sur la branche seule : vert (1002 fiches). `perimetre.mjs` : vert.
- CI : les 9 jobs sont verts (gardes, verifier, tests, lint, types, e2e, gitleaks, licences, stryker).
- Fichiers : 7, tous dans `fichiers_autorises`. Aucun mot interdit, aucun prix, aucun secret, aucun nom réel.

## Remarques (non bloquantes, reprises)
- La fiche L00-T85 ne cite pas `L00-T84` dans `depend_de`, alors que l'ordre de fusion en dépend.
- C04/C02 sans fiche qui les branche, exceptions permanentes de `domaines-sans-prefixe.ts`, chemins `/profil/champs/{cle}` sans préfixe.
