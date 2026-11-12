VERDICT: OK
PR n°1184, fiche L25-T05, tête be865aab46f0db74383d9286020aad5039dd998c (seconde relecture, relecteur Opus, lot 5 ; fiche lue sur origin/main). Avis précédent : A CORRIGER sur e40dbde45799f2c7717f94cc8eb9647d21519d03.

## Défauts précédents : levés (vérifiés par mutation)
1. Essai mensuel : les faux sont maintenant cohérents (manifeste, mesure, pièce), et le test exige `resultat: 'reussi'`. Il passe. Les cas bloc altéré et clé absente sont toujours vérifiés.
2. Octets après le bloc final (`chiffrement-sauvegarde.ts:81`) : remplacer la vérification par `{ ok: true }` fait rougir 1 test (attendu : `bloc_altere`, bloc 1).
3. Borne de longueur (`:70`) : `TAILLE_BLOC + 1000` fait rougir 1 test (longueur forgée `TAILLE_BLOC + 1`, attendu : `bloc_altere`, bloc 0).
4. Taille : 220 lignes pour un maximum de 220, sans amendement de la fiche.
Remarque précédente levée : retirer le contrôle de `MAGIE` ou de `VERSION` fait rougir 1 test (`dechiffrement_impossible`).

## Régressions : aucune
- La refonte de `nonce` (concaténation sel + compteur sur 4 octets en gros-boutiste) est équivalente à l'ancien `writeUInt32BE`. Figer le compteur à 0 fait rougir 3 tests. Retirer les données associées en fait rougir 4, retirer la vérification de clé en fait rougir 1.
- Les retraits portent sur des commentaires, pour tenir la taille ; le comportement est inchangé. Le journal regroupe désormais ses lignes en 4 lignes.
- 4 fichiers, tous dans `fichiers_autorises` ; 7/7 tests en local ; `essai-mensuel.test.ts` reste vert (12/12) ; `essai-mensuel.ts` est inchangé ; aucune clé en dur, aucun mot interdit, aucun prix.

## Remarques (non bloquantes)
- L'écart déclaré au journal reste à valider par Will : `dechiffrerFlux` prend un rappel `surClair`.
- Les commentaires de doc retirés (`lecteur`, `creerPortDechiffrer`, réserve d'un octet dans `chiffrerFlux`) aidaient la lecture. On peut les rétablir si la fiche est un jour amendée en taille.
- CI : `tests` est rouge à cause de `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`), qui rougit aussi sur origin/main 347401ab. `verifier` est rouge parce qu'il en dépend. Ce n'est pas un défaut de l'auteur.
- La fiche est sensible : fusion par Will seul.
