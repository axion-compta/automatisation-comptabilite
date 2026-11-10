VERDICT: A CORRIGER
SHA relu: d4c7c5dcf82ff70aa85fa2ac45e1f5d1e365892e

PR 975, fiche L15-T58 (raccourcis d'une lettre et état du menu mémorisé). Seconde relecture Opus locale, après la correction d4c7c5dc. CI : tests, e2e, lint et types VERTS ; gardes et verifier ROUGES.

Défaut de l'avis précédent (SHA f6b20c67) :
1. Deux FournisseurPreferences imbriqués, avec des états qui divergent. CORRIGÉ sur le fond (2e voie proposée). Dans apps/web/src/donnees/preferences.tsx:136-138, un FournisseurPreferences placé sous un Ctx existant rend ses enfants tels quels. Seul le fournisseur racine (FournisseurRacine) garde l'état, la copie locale et la file. Le hook useContext est appelé sans condition, donc les règles des hooks sont respectées. Le fournisseur de T05 devient transparent sous la coque. Coque.tsx:52-56 relit `racc` à chaque rendu, donc `reglage.current.actifs` suit la désactivation faite dans T05.
   Test `fournisseur-imbrique-partage-l-etat-du-parent` (preferences.test.tsx:127) : il écrit dans le fournisseur interne, puis vérifie trois choses. Le parent voit `false`. Une écriture du parent (menu_etat) ne rétablit pas la valeur dans la copie locale. Les deux clés sont présentes. Avec l'ancien code, l'assertion `coque === 'false'` et `copie.raccourcis.actifs === false` échoueraient : le test prouve donc le comportement. Il le prouve au niveau du fournisseur, pas par T05 + coque + une lettre, mais il couvre le mécanisme en cause.

Nouveau défaut :
2. garde:perimetre ROUGE : « fichier hors liste : apps/web/src/donnees/preferences.tsx » et « apps/web/src/donnees/__tests__/preferences.test.tsx ». La garde lit la fiche sur origin/main, jamais sur la branche (outils/gardes/perimetre.mjs, lignes 2 et 202). L'amendement de pilotage/fiches/L15-T58.md, fait dans la PR, ne compte donc pas. Le contenu de l'amendement est légitime : il ajoute 2 fichiers, ceux de la voie proposée par l'avis précédent. Correction : passer l'amendement par une PR de pilotage fusionnée sur main AVANT, comme #969 (L00-T67). Puis relancer la CI de la PR 975. Aucune autre correction de code n'est demandée.

Vérifié :
- Le commit de correction ne touche que preferences.tsx (+6/-1), son test (+17) et la fiche (1 ligne).
- Taille totale : 241 lignes, pour 280 permises.
- Journal : 7 lignes, il commence par « # Journal L15-T58 ».
- Aucun prix, aucun nom réel, aucun mot interdit.

Remarques (non bloquantes, toujours non traitées) :
- Coque.tsx:57-61 : les lettres sont calculées une seule fois au montage. Un `remap` changé ensuite n'est appliqué qu'au remontage, et deux actions qui ont la même lettre s'écrasent en silence.
- Menu réduit à 72 px : le bouton garde le texte long « Agrandir le menu ».
