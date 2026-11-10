VERDICT: OK
SHA relu: d4c7c5dcf82ff70aa85fa2ac45e1f5d1e365892e

PR 975, fiche L15-T58 (raccourcis d'une lettre et état du menu mémorisé). Troisième relecture Opus locale. Le SHA de tête n'a pas changé depuis la seconde relecture : le code relu est le même. CI relancée le 10/11 à 21h40 sur ce SHA : les 9 contrôles sont VERTS (e2e, gardes, gitleaks, licences, lint, stryker, tests, types, verifier).

Défauts des avis précédents :
1. FournisseurPreferences imbriqués avec des états qui divergent. CORRIGÉ. preferences.tsx:136-138 : sous un contexte existant, le fournisseur imbriqué rend ses enfants et réutilise l'état du parent. Le test `fournisseur-imbrique-partage-l-etat-du-parent` (preferences.test.tsx:127) prouve le comportement : il échouerait avec l'ancien code.
2. garde:perimetre ROUGE (preferences.tsx et son test hors liste). LEVÉ : l'amendement est sur main (L00-T71, #979 puis #980). fichiers_autorises sur main liste les 10 fichiers du diff.

Vérifié :
- Fiche de la branche contre main : seule différence, `statut: a_faire` → `statut: fait`. Pas de divergence avec l'amendement de main.
- git merge-tree --write-tree origin/main origin/lot-15/L15-T58 : aucun conflit.
- Diff : 10 fichiers, 223 ajouts et 18 retraits, sous les 280 lignes.
- Aucune régression nouvelle : rien n'a changé dans le code depuis la seconde relecture, et la CI complète est verte (e2e compris).

Remarques (non bloquantes, notées pour une fiche de suite) :
- Coque.tsx:57-61 : les lettres sont calculées une seule fois, au montage. Un `remap` changé ensuite ne s'applique qu'au remontage. Deux actions qui ont la même lettre s'écrasent sans prévenir.
- Menu réduit à 72 px : le bouton garde le texte long « Agrandir le menu » (packages/textes/src/ecrans/socle.ts:29). Il faudrait une icône avec une étiquette accessible, ou un texte court.
