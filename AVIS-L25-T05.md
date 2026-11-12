VERDICT: A CORRIGER
PR n°1184, tête e40dbde45799f2c7717f94cc8eb9647d21519d03 (fiche lue sur origin/main).

Vérifié : fichiers dans `fichiers_autorises`, 217 lignes pour un maximum de 220. Les 7 tests nommés passent, `essai-mensuel.test.ts` passe toujours (19/19), `essai-mensuel.ts` inchangé. Le numéro de bloc, le drapeau final et l'en-tête sont dans les données associées ; nonce = sel du flux + compteur. Aucun secret (clés générées dans les tests), aucun mot interdit.

Défauts :
1. Fiche contredite par le test, `apps/serveur/src/exploitation/__tests__/chiffrement-sauvegarde.test.ts:96`. La fiche exige que « l'essai mensuel avec ce port réussit sur un dump fictif ». En réalité l'essai rend `resultat: "echec"`, `cause: "controles_en_echec"` (manifeste `IMPOSSIBLE`, car `manifesteDump`, `mesurer` et `lirePiece` lèvent une erreur). Le test vérifie seulement que la cause n'est pas une cause de déchiffrement. Correction : fournir des faux cohérents (manifeste, mesure, pièce) et vérifier `resultat === 'reussi'`.
2. Mutant survivant : `chiffrement-sauvegarde.ts:89`. Si l'on remplace `(await lire(1)) === null ? { ok: true } : echec('bloc_altere', bloc + 1)` par `{ ok: true }`, les tests restent verts. Des octets ajoutés après le bloc final seraient alors acceptés sans aucun test. Ajouter : flux valide + 1 octet → `{ ok: false, cause: 'bloc_altere', bloc: <n final + 1> }`.
3. Mutant survivant : `chiffrement-sauvegarde.ts:80`. Remplacer `longueur > TAILLE_BLOC` par `longueur > TAILLE_BLOC + 1000` passe les tests. Cette borne empêche un en-tête de bloc forgé (longueur `0xFFFFFFFF`) de faire tamponner 4 Gio avant l'authentification. Ajouter un test de frontière : longueur `TAILLE_BLOC + 1` → `bloc_altere` avec le numéro du bloc.
4. Budget de taille : 217/220. Les ajouts 1 à 3 dépasseront `taille_max_lignes`. Il faut compacter les tests ou faire amender la fiche par Will (fiche sensible).

Remarques (non bloquantes) :
- Mutants survivants sans effet sur la sécurité, mais qui changent la cause rendue : contrôle de `MAGIE` et de `VERSION` (`:73`) ; une version modifiée rend `bloc_altere` au lieu de `dechiffrement_impossible`. Un test d'une ligne suffirait.
- Mutants équivalents acceptés : `>=` dans la boucle de découpe, contrôle du drapeau (déjà couvert par les données associées), `cle === null` dans `creerPortDechiffrer`, `MAX_BLOCS` (impossible à tester).
- Écart déclaré au journal : `dechiffrerFlux` prend un rappel `surClair` au lieu de rendre le clair. Ce choix tient en mémoire ; il est à valider par Will.
