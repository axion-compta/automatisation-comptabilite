VERDICT: OK

Fiche L04-T40, PR #1044, SHA relu : 000c25e366d7e3f00ed51244db091fb6299ddc89
Fiche lue sur origin/main (7c5f74c). PR empilée sur #1041 (L04-T31) : seul l'apport propre de la fiche (commit 000c25e) est relu ; L04-T31 a son propre avis (avis/L04-T31).

## Vérifications
- Fichiers propres à la fiche : 6, tous dans `fichiers_autorises` (`route.tsx`, `Ecran.tsx`, `e07.test.tsx`, `e07.ts`, fiche, journal). Fiche : seul `statut: fait`.
- Taille propre : 276 lignes ≤ 300 (433 au total avec #1041).
- Route `e07` `/documents` groupe `menu` ; `<h1>` ; 5 champs de filtre chacun dans un `<label>` visible, envoi par formulaire (Entrée ou bouton) ; tableau date, fournisseur, nom, TTC par `Montant`, état, `MotConfiance` ; lien `/documents/piece?id=` ; pagination par 50 ; états chargement, vide, erreur ; « Préparé par IA, à valider ».
- Aucun total calculé, aucun `%`, confiance en mots seulement. Pièce sensible : « pièce protégée » ; le nom normalisé ne porte pas le fournisseur (vérifié sur les 32 pièces fictives).
- Tous les textes dans `e07.ts`, vouvoiement ; aucun mot interdit, aucun prix, données fictives. Journal 7 lignes, commence par `# Journal L04-T40`.
- Les 7 tests nommés sont présents.

## Tests
- `vitest run src/ecrans/e07` : 7/7 verts. `garde:textes` vert ; eslint et tsc propres.
- Mutations (toutes rougissent, puis annulées) : masquage sensible retiré (`sensible-protegee`) ; mention non comptée retirée (`non-comptee-marquee`) ; filtre état non envoyé (`filtre-par-etat`) ; `<label>` remplacés par `<div>` (3 rouges).
- Gardes `perimetre` et `termine` rouges tant que #1041 n'est pas fusionnée : dû seulement à la PR amont, pas un défaut.

## Remarques
- `apps/web/src/ecrans/e07/Ecran.tsx:46` : le « motif » de non-comptage affiché est le libellé de l'état (ex. « Prête » puis « non comptée (Prête) »), car `PieceResume` n'expose pas `motifNonComptee`. Écart déclaré au journal. Une fiche de contrat pourrait ajouter `motifNonComptee` au résumé ; non bloquant ici.
- Aucun test ne couvre la pagination (pas exigé par les 7 tests nommés ; le jeu fictif a 32 pièces < 50).
- Filtre `au` (service L04-T30, hors fiche) : comparaison de chaîne entre `recuLe` (date-heure) et une date seule, ce qui exclut les pièces reçues le jour même de la borne `au`. À suivre dans le service.
