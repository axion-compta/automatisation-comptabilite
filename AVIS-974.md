VERDICT: A CORRIGER
SHA relu: 0c81f8b5ac82c5fb462371d56121c32b9c063a69

PR 974, fiche L07-T19 (domaine demande de palier). Seconde relecture Opus locale, après la correction 0c81f8b5. CI : tests VERTS ; gardes et verifier ROUGES.

Défauts de l'avis précédent (SHA f50c9009) :
1. Test existant cassé (abonnement-branchement.test.ts, 'palier-b'). CORRIGÉ sur le fond. Les lignes 24 et 36 postent 'compta-2', un palier fictif valide et supérieur à compta-1. `trois-routes-branchees` vérifie donc à nouveau la route réelle : ni 404, ni 400. La CI tests est verte.
2. garde:portes ROUGE (porte « maquette validée » e53 absente sur main). NON LEVÉ. Ce n'est pas du ressort de l'auteur : il faut que Will valide la maquette E53 (pilotage/portes/e53.json sur main).

Nouveau défaut :
3. garde:perimetre ROUGE : « fichier hors liste : apps/serveur/src/__tests__/abonnement-branchement.test.ts ». La garde lit la fiche sur origin/main, jamais sur la branche (outils/gardes/perimetre.mjs, lignes 2 et 202). L'amendement de pilotage/fiches/L07-T19.md, fait DANS la PR, ne compte donc pas. Le contenu de l'amendement est légitime : il ajoute un seul fichier, celui que l'avis précédent demandait d'autoriser. Correction : passer l'amendement de fichiers_autorises par une PR de pilotage fusionnée sur main AVANT, comme #969 (L00-T67). Puis relancer la CI de la PR 974. Aucune autre correction de code n'est demandée.

Vérifié :
- Le commit de correction ne touche que le test de branchement (2 lignes) et la fiche (1 ligne). Le code relu au premier avis n'a pas changé.
- Périmètre au sens de la fiche amendée : 9 fichiers, tous listés. Taille sous les 280 lignes.
- Journal : 4 lignes, il commence par « # Journal L07-T19 ».

Remarques (non bloquantes) :
- `palier-inferieur-ou-identique-422` ne joue toujours que le cas identique. C'est signalé au journal, et le cas inférieur est couvert dans le noyau.
