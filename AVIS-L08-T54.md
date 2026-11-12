VERDICT: A CORRIGER
SHA: 62de13a6c6875af61a5e180789c581001ff2079a
PR: #1085

Fiche L08-T54 (sensible : fusion par Will seul), relue au SHA de tête 62de13a6c6875af61a5e180789c581001ff2079a (relecteur Opus). L'avis précédent était OK au SHA 33e6de975747a809f0404b4217ef827b06b5019f (PR #1082, branche `lot-08/L08-T54-reprise`). `pilotage/ARRET` absent sur origin/main.

## Constat : le conflit n'est PAS résolu
- La tête de `lot-08/L08-T54` n'a pas bougé : 62de13a6, commit du 08/11/2026 qui ne touche que `pilotage/fiches/L08-T54.md`. Il n'y a eu aucune fusion de main. Le correcteur l'a écrit dans la PR : `git merge origin/main` refuse (« unrelated histories »).
- `git merge-base origin/main origin/lot-08/L08-T54` ne rend rien. L'historique de main a été réécrit, et la branche n'a plus d'ancêtre commun avec lui. GitHub marque la PR « dirty », et aucun job de CI n'a tourné sur cette tête.
- Le corps de la PR dit « même contenu (SHA 33e6de97) ». C'est faux : la branche ne pointe pas sur 33e6de97.

## Fichiers propres de la fiche : PAS inchangés
Comparaison avec la version relue OK (33e6de97) :
- `packages/noyau/src/rgpd/exercice-violation.ts` : absent de la tête (présent dans 33e6de97, blob 7a12d4c2).
- `packages/noyau/src/rgpd/__tests__/exercice-violation.test.ts` : absent de la tête (blob a9cee88e dans 33e6de97).
- `pilotage/fiches/L08-T54.md` : différent (tête 99d2866e, 33e6de97 62c97c8a, main cad7a936).
- `pilotage/journal/L08-T54.md` : différent (tête 5b5f524a = main, 33e6de97 3f221f8a).
Le code et les 9 tests nommés relus OK ne sont donc pas dans cette PR. Comparée à main, la tête diffère sur 1555 fichiers (64 704 lignes retirées).

## Ce qui débloque (geste de Will, ce n'est pas un défaut de l'auteur)
- `lot-08/L08-T54-reprise` (33e6de97) a bien un ancêtre commun avec l'actuel main (599f7b33). Il faut mettre `lot-08/L08-T54` sur ce contenu : soit Will remplace la branche par 33e6de97 (le relecteur et les auteurs n'ont pas le droit de forcer), soit on recrée la branche depuis origin/main avec les 4 fichiers de la fiche seulement. Ensuite, fusionner main, relancer la CI, puis demander une nouvelle relecture au nouveau SHA de tête.
- Aucune relecture du code n'est possible à ce SHA, puisque le code n'y est pas.
