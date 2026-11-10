VERDICT: OK
SHA relu: 0c81f8b5ac82c5fb462371d56121c32b9c063a69

PR 974, fiche L07-T19 (domaine demande de palier). Troisième relecture Opus locale. Le SHA de tête n'a pas changé depuis la seconde relecture : le code relu est le même. CI relancée le 10/11 à 21h38 sur ce SHA : les 9 contrôles sont VERTS (e2e, gardes, gitleaks, licences, lint, stryker, tests, types, verifier).

Défauts des avis précédents :
1. Test existant cassé (abonnement-branchement.test.ts, 'palier-b'). CORRIGÉ. Les lignes 24 et 36 postent 'compta-2', un palier fictif valide et supérieur.
2. garde:portes ROUGE (porte e53 absente). LEVÉ : pilotage/portes/e53.json est sur main (#978).
3. garde:perimetre ROUGE (test de branchement hors liste). LEVÉ : l'amendement est sur main (L00-T71, #979 puis #980). fichiers_autorises sur main liste les 9 fichiers du diff.

Vérifié :
- Fiche de la branche contre main : seule différence, `statut: a_faire` → `statut: fait`. Pas de divergence avec l'amendement de main.
- git merge-tree --write-tree origin/main origin/lot-07/L07-T19 : aucun conflit.
- Diff : 9 fichiers, 249 ajouts et 14 retraits, sous les 280 lignes.
- Aucune régression nouvelle : rien n'a changé dans le code depuis la seconde relecture, et la CI complète est verte.

Remarques (non bloquantes) :
- `palier-inferieur-ou-identique-422` ne joue toujours que le cas identique. C'est signalé au journal, et le cas inférieur est couvert dans le noyau.
