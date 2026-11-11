VERDICT: OK
SHA relu : 05d8742b62105f3fc2ee3fe54884b9cc2c181dc0

# Avis de relecture PR 997 (L15-T61, travaux de fond), seconde relecture. Fiche sensible : fusion par Will seul

Fiche lue sur origin/main. Relecture au SHA de tête ci-dessus, après le correctif 05d8742 qui suit l'avis au SHA f7dd65a.

## Défaut bloquant de l'avis précédent
1. Invalidation non vérifiée par le test d'écriture antidatée : **corrigé**. `interface.test.ts:109` devient un `it.each` à deux cas. Le cas sans `x.monter()` garde la version à 1 et exige `x.calculs` égal à `['2026-03-01']`, tous les instantanés valides à la version 1 (donc avril inchangé), et la carte `ecr-1@2026-03-15` ouverte. Le titre trompeur « période voisine intacte » a disparu.

## Mutations à la main (dans `evenements-interface.ts`, appliquées puis annulées)
- `appliquerEvenement` remplacé par la liste lue telle quelle : le cas « version montée : false » échoue (il passait avant le correctif).
- `recalculerInstantanes` retiré : les deux cas de l'écriture antidatée échouent.
- Carte toujours ouverte : « écriture hors période déclarée : aucune carte » échoue.
- `e.version <=` remplacé par `<` : le test d'idempotence échoue.

## Contrôles
- Fichiers : 5, tous dans `fichiers_autorises`. Taille : 299 + 1 = 300 lignes, à la limite sans la dépasser. Aucune dépendance. Aucun octet NUL. Aucun alias de `it`.
- Vitest : 9 tests verts sur 9. `tsc --noEmit -p apps/serveur` vert, eslint vert sur `apps/serveur/src/travaux`. La CI GitHub au SHA relu est verte (9 contrôles).
- Aucun mot interdit, aucun prix ni secret. Données fictives. Journal : 9 lignes, il commence par `# Journal L15-T61`.
- Pas de régression : seul le fichier de test change depuis le SHA f7dd65a, et le cas d'avant (version montée) est gardé.

## Remarques
- La PR est à 300 lignes pile : toute retouche devra en retirer autant qu'elle en ajoute.
- Les remarques de l'avis précédent restent valables : événement sans `charge.date` ignoré sans signal, date invalide relivrée sans fin, `derniereVersion` indexée par `objet_id` seul, Map `files` jamais purgée, tests sur faux en mémoire et non « sur base de test » (à confirmer par Will).
