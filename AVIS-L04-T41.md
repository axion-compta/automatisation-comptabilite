VERDICT: OK

Fiche L04-T41, PR #1046, SHA relu : fd29ca6ca701332c192b73ab36f7e75f1536b78a
Fiche lue sur origin/main (7c5f74c). PR empilée sur #1041 (L04-T31) : seul l'apport propre de la fiche (depuis le merge 52693ed) est relu.

## Vérifications
- Fichiers propres à la fiche : 6, tous dans `fichiers_autorises`. Fiche : seul `statut: fait`.
- Taille propre : 274 ajouts + 1 suppression = 275 ≤ 280.
- Route `e08` `/documents/piece` groupe `autre`, `id` lu dans la recherche. `<h1>` = nom normalisé (titre de l'écran pendant le chargement et en erreur) ; liste de définitions par `ChampLu` ; `Montant` pour les centimes ; type, état, comptée / non comptée et motif ; motifs « à vérifier » en mots ; pièce sensible : « pièce protégée » et aucun champ ; id absent ou pièce inconnue : erreur + lien `/documents` ; mention des originaux ; « Préparé par IA, à valider ».
- `tauxEnTexte` par découpage de chaîne, aucun taux légal écrit ; cas 1900, 550, 0, 5 et entrée non numérique testés.
- Aucun mot interdit, pas de « jeter », aucun prix, données fictives. Journal 7 lignes, commence par `# Journal L04-T41`.
- Les 7 tests nommés sont présents.

## Tests
- `vitest run src/ecrans/e08` : 7/7 verts. `garde:textes` vert ; eslint et tsc propres.
- Mutations (toutes rougissent, puis annulées) : zéros de fraction gardés dans `tauxEnTexte` (`affiche-les-champs`) ; tous les champs forcés `douteux` (`seul-le-champ-douteux-en-evidence`) ; branche sensible retirée (`sensible-aucun-champ`) ; motif affiché en code brut (`motifs-en-mots`) ; mention des originaux retirée (`mention-conservation-des-originaux`).
- Gardes rouges tant que #1041 n'est pas fusionnée : dû seulement à la PR amont, pas un défaut. Les portes e07 et e08 sont désormais sur main.

## Remarques
- `apps/web/src/ecrans/e08/__tests__/e08.test.tsx:21` : les tests remplacent `fetch` par un bouchon qui appelle `detailPiece` et recopie à la main le corps 404, au lieu du faux serveur (`demarrerNoeud`, comme E07). Même service, donc les données sont justes, mais les handlers MSW de L04-T31 ne sont pas exercés par cet écran. Non bloquant (la fiche ne l'impose pas) ; préférer `demarrerNoeud` à la prochaine tranche.
- `apps/web/src/ecrans/e08/Ecran.tsx:16` : un code de type, d'état ou de motif inconnu est affiché « Autre … » sans trace ; acceptable en lecture.
