VERDICT: OK

Fiche : L15-T65 (sensible : oui) — PR #1022
SHA relu : f58420f9b94a0d68f2537952ba2c8f20ad6c3886

## Contrôles
- Fichiers modifiés : les 4 sont dans `fichiers_autorises`.
- Taille : 295 ajouts, 1 suppression (plafond 300), aucune ligne « - - ».
- Journal : 7 lignes, commence par `# Journal L15-T65`.
- Mots interdits, prix, secrets, octet NUL : aucun. Données fictives (p-alice, « Dupuis Fictif »).
- Aucune durée en dur dans le code : la garde est le paramètre `gardeMs`.
- Tests ciblés `exports-fichiers.test.ts` : 13/13 verts. `tsc --noEmit` (apps/serveur) vert.
- `pnpm verifier` en local : toutes les étapes vertes sauf `types`, qui échoue seulement sur le contrôle de version de Node du cloud (22 au lieu de 24) ; `tsc` lancé directement passe.
- Critères de la fiche couverts : expert révoqué 403, autre personne ou société 404, expiré 410 sans octet servi.

## Défauts de l'avis précédent (SHA b2b7de5b5db7ea07db7f0265951244a0acbff244), vérifiés par mutation
1. Marquage « expiré » non testé : corrigé.
   - M1 : `f.marqueExpire ||` retiré dans `telecharger` : 1 test rouge.
   - M2 : `f.marqueExpire ||` retiré dans `etat` : 1 test rouge.
   - M7 : `marquerExpire` du faux stockage rendu inactif : 2 tests rouges.
2. Garde des 24 h écrite en dur : corrigé.
   - M3 : `maintenantMs() + gardeMs` remplacé par une durée de 24 h en dur : 4 tests rouges.
   - M4 : contrôle de `gardeMs` supprimé : 1 test rouge.
   - M5 : `gardeMs <= 0` changé en `< 0` : 1 test rouge.
   - M6 : `isSafeInteger` changé en `isFinite` (1.5 accepté) : 1 test rouge.

## Autres mutations
- M8 : échéance `>=` changée en `>` : 1 test rouge.
- M9 : refus des droits ignoré au téléchargement : 3 tests rouges.
Toutes les mutations ont été annulées ; l'arbre de travail est propre.

## Remarques (non bloquantes)
- CI : le job `e2e` est annulé, ce qui met `verifier` au rouge sur GitHub. Le diff ne touche pas à l'e2e. Un nouveau lancement par Will est nécessaire avant la fusion.
- Fiche sensible : fusion par Will seul, après la double relecture.
