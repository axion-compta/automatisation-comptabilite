VERDICT: A CORRIGER

# Avis L00-T84, 2e relecture (PR #1049 fiche seule, PR #1050 exécution, SENSIBLE)

SHA de tête relus :
- PR #1049 : 67b3d22f79dc90dd48fda825bdb3060dffb8f932
- PR #1050 : 87f259d24a030dfd6ae76f7b2826607af287e063

## Points de l'avis précédent (af95306, 952043e)
- Défaut bloquant (préfixe retiré des régimes, paramètres, identité) : CORRIGÉ. Nouvelle fiche sensible `L09-T53` (contrat, vrai serveur, faux serveur, 401 et 404 au même corps, 4 tests nommés). « restent sans préfixe » n'apparaît plus nulle part. Fichiers de L09-T53 vérifiés sur main (`regimes.ts`, `parametres.ts`, `identite.ts` et leurs tests, contrat et serveur ; `suite-profil.ts` sert ces chemins). Mutations : retrait de `L09-T52` de `depend_de` de L09-T53 → `garde:fiches` rouge (partage `openapi.json`, `app.ts`) ; retrait de `L09-T37` de L09-T49 → rouge. Critère `git grep 'L09-T49' -- L09-T53.md` : 7 lignes.
- Remarque 1 (E39) : corrigée, « E45 (main) et E39 (PR 1048) ».
- Remarque 2 (`app.ts` avec L04-T51, L06-T38) : corrigée dans les Pièges de L00-T84, L09-T49 et L09-T53.
- Remarque 3 (404 sans préfixe sur le vrai serveur) : corrigée, test nommé `chemin-profil-sans-prefixe-404`.

## Vérifié
- #1049 ne touche que `pilotage/fiches/L00-T84.md` (35 lignes) ; #1050 ne touche que ses 6 `fichiers_autorises` : 35+28+34+36+4+10 = 147 lignes (max 190).
- #1050 : `node outils/gardes/fiches.mjs` vert (921 fiches) ; `garde:termine` vert ; les 3 critères `git grep` rendent des lignes (2, 5, 7). CI : seule `gardes` est rouge, pour `garde:perimetre` (« fiche L00-T84 introuvable sur origin/main ») : attendu tant que #1049 n'est pas fusionnée, pas un défaut de l'auteur.
- L10-T37 inchangée depuis l'avis précédent (ligne 62 seule, `toEqual` exact).
- Aucun mot interdit, aucun prix, aucune donnée réelle ; aucun `bloque_par` levé ; aucune décision de Will inventée.

## Défaut bloquant
1. `pilotage/fiches/L00-T84.md:8` de la PR #1049 : `statut: fait`, introduit par le commit 67b3d22 (il était `a_faire` jusqu'à 8c9e0bc). Une PR « fiche seule » doit garder `statut: a_faire` (titre de #1049 et modèle L00-T81 #1024) ; c'est #1050 qui passe la fiche à `fait` avec son journal. Effet : `garde:termine ROUGE - L00-T84 : fait sans journal pilotage/journal/L00-T84.md` (reproduit en local sur la tête, et job `gardes` rouge en CI) ; fusionnée telle quelle, #1049 rendrait `main` rouge. Mutation : remettre `a_faire` → `garde:termine` vert.
   Correction demandée : dans #1049, `statut: fait` → `statut: a_faire` (seule ligne à changer). Puis remettre #1050 à jour par merge (sa ligne `statut: fait` reste).

## Recoupement avec la PR #1061 (L00-T85)
- Aucun fichier commun : #1061 ne modifie ni `L09-T49.md` ni une fiche de #1050 (L00-T85, L06-T38, L09-T44, L09-T54, L11-T38, L11-T47). Pas de mêmes lignes en conflit.
- Recoupement de sens, bloquant pour la seconde fusionnée : en fusionnant localement #1050 et #1061, `garde:fiches` devient ROUGE : « L09-T52 et L09-T54 (même lot) partagent `profil-champs.ts`, `profil-champs-service.ts` sans dépendance entre elles ». L09-T54 (#1061) dépend de L09-T49 seulement.
- #1061 suppose aussi la L09-T49 de #1050 : L11-T38 réutilise « la session vérifiée que L09-T49 ajoute au contexte dans `app.ts` » (`sessionDeRequete`), qui n'existe que dans la L09-T49 amendée par #1050.
- Ordre : #1049, puis #1050, puis #1060 et #1061. Avant de fusionner #1061, son auteur ajoute `L09-T52` au `depend_de` de `pilotage/fiches/L09-T54.md` (fichier de L00-T85) après merge de main ; sinon `main` passe rouge.

## Remarques (non bloquantes)
- `pilotage/journal/L00-T84.md:6` : « L09-T52 : … dépend de L09-T49 et L09-T52 » ; la fiche L09-T52 dépend de L09-T49 seulement. Écrire « dépend de L09-T49 ».
