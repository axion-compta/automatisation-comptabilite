VERDICT: OK
b2569d6a1f5cc6374d263ef148c3228159bc2fa2

PR #1072, fiche L08-T40, SHA de tête relu : b2569d6a1f5cc6374d263ef148c3228159bc2fa2 (base main ca9e7d98898ea22a8877333c4fd083152747be8e).
Relecture après changement de tête. Le dernier avis OK portait sur le SHA 84842117f2ac2d52f1331423d39701ce23e3b7b7.

## Ce qui a changé depuis 84842117
- Un seul commit propre : `b2569d6a merge: main dans lot-08/L08-T40`. Merge, sans rebase ni force-push. Il reprend main, qui contient maintenant L08-T39 (#1051) et L08-T37 (#986), fusionnées en squash.
- `git diff --numstat origin/main...HEAD` ne contient plus que les 5 fichiers de la fiche : `DemandesPersonnes.tsx` (59/6), `TraiterDemande.tsx` (70), `traiter-demande.test.tsx` (155), fiche (1/1) et journal (8). Total 300 lignes, limite 300. Tous sont dans `fichiers_autorises`.
- Ces 5 fichiers sont identiques octet pour octet à ceux du SHA 84842117. La branche contient main (le diff à deux points est égal au diff à trois points).

## CI au SHA de tête
- Les 9 jobs sont verts : `verifier`, `gardes`, `tests`, `e2e`, `lint`, `types`, `gitleaks`, `licences` et `stryker`. `garde:perimetre`, rouge à l'avis précédent à cause des fichiers de #1051, est maintenant vert.

## Remarque
- La taille est à la limite exacte (300 sur 300) : toute retouche future de cette PR devra rester neutre en lignes.
