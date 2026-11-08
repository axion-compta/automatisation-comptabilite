VERDICT: A CORRIGER
SHA relu : cfeade662ded3f927cc7ef2acfb588d13d9d3737 (branche pilotage/L12-T48-j3a, PR 872, fiche L12-T48)

## Points vérifiés
- Diff : seul `pilotage/fiches/L12-T48.md` (16 ajouts, 9 retraits).
- Fiche : 15 champs, tableaux JSON valides, aucun guillemet double interne ; `node outils/gardes/fiches.mjs` : 887 fiches cohérentes. La ligne `bloque_par` est bien retirée du Contexte.
- Aucun mot interdit, aucun prix, aucun octet NUL.
- La fiche respecte J3a : interface, adaptateur en mémoire, aucune base, aucune migration exécutée, réel hors périmètre jusqu'à J10. `sensible: oui` est maintenu.
- Garde migrations : `outils/gardes/migrations.mjs` ne lit que `git ls-files apps/serveur/src/base/migrations` (DOSSIER, ligne 7). `apps/serveur/src/persistance/sql/a_compta-journal-verification.sql` ne sera donc pas pris. Aucune autre garde ne filtre l'extension `.sql`.
- Les briques citées existent : `packages/noyau/src/controles/journal.ts` (L12-T24) et `apps/serveur/src/persistance/declarations.ts`.
- Les fichiers autorisés couvrent les étapes 2 à 7. Aucun fichier hors périmètre n'est nécessaire.
- Exigences : V3-CTL-070 (journal en ajout seul) et V3-CTL-001 (catalogue, colonnes de `regle_controle`, alignées sur `docs/controles.csv`) sont cohérentes avec le contenu.

## Défauts bloquants
1. `pilotage/fiches/L12-T48.md:27` et `:29` : les codes `ligne_invalide`, `contexte_invalide` et `inconnu` sont déclarés sans dire quand ils sont levés, et aucun test nommé ne les couvre. `inconnu` n'a même aucun usage, puisque `modifier` et `supprimer` lèvent `ajout_seul` même pour un id inconnu.
   Pour une fiche sensible, chaque auteur inventerait sa propre validation, et les cas limites demandés (NaN, Infinity, non entiers, vides) ne seraient pas testés.
   Correction demandée :
   - définir `ligne_invalide` : `versionParametres` vide, `versionRegle` non entier ou inférieur à 1, `ecartCentimes` ou `valeur` numérique NaN, Infinity ou non entier, horodatage vide ;
   - définir `contexte_invalide` : société vide ;
   - retirer `inconnu` ou lui donner un usage ;
   - ajouter les tests nommés `ligne-invalide` (NaN, Infinity, non entier, vide), `contexte-invalide` et `lot-vide`.
2. `pilotage/fiches/L12-T48.md:22`, `:29` et `:30` : l'adaptateur isole par société (« La société vient TOUJOURS du contexte », test `isolation-societe`), mais la table SQL n'a que 10 colonnes, sans société. L'index porte sur (objet, horodatage), sans société.
   Le SQL texte et l'adaptateur décrivent donc deux contrats différents, et la future table ne permettrait pas l'isolation que le faux promet.
   Correction demandée : ajouter une colonne société (11 colonnes, test SQL ajusté) et indexer sur (société, objet, horodatage). Sinon, écrire explicitement que `a_compta` est un schéma par société, et le tester par lecture.
3. `pilotage/fiches/L12-T48.md:14` : `taille_max_lignes: 300` semble trop juste pour 5 fichiers. En repère, le couple le plus proche sur main fait 280 lignes : `declarations.ts` (43) + `declarations-memoire.ts` (107) + son test (130). Il faut y ajouter le SQL (environ 40), le test SQL (environ 50), le journal (10) et le changement de statut, soit environ 380.
   Correction demandée : porter la taille à 380, sous la limite de 400. Sinon, sortir le SQL et son test dans une fiche à part.

## Remarques
- `pilotage/fiches/L12-T48.md:28` : l'historique est trié « par horodatage puis ordre d'ajout », alors que `historiqueObjet` (L12-T24) trie par horodatage puis `regleId`. Préciser lequel fait foi, pour que le faux et la brique pure ne divergent pas.
- `pilotage/fiches/L12-T48.md:27` : préciser la forme de `objet` dans `historique(ctx, objet)`. `TraceControle` porte `objetType` et `objetId` : ce sont donc deux colonnes SQL et non une seule, ce qui change le compte « 10 colonnes ».
- `pilotage/fiches/L12-T48.md:22` : `docs/controles.csv` a aussi une colonne `gravite`, absente des 8 colonnes ajoutées à `regle_controle`. À confirmer avec la spec.
- `node outils/gardes/controles.mjs` ne lit que `packages/noyau/src/controles/**/__tests__`. Un second test nommé `CT-40` côté serveur ne pose donc pas de conflit.
