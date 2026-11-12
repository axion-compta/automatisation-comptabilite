VERDICT: OK
7982d69560fce0c1ccc7da4fa32dfc55c7bb3f12

PR #1068, fiche L04-T42, SHA de tête relu : 7982d69560fce0c1ccc7da4fa32dfc55c7bb3f12
Relecture de contrôle : l'avis OK portait sur 5b99f15d ; la tête a changé.

## Ce qui a changé depuis 5b99f15d
Deux commits de l'auteur (pas une fusion de main), qui ne touchent que `apps/web/src/ecrans/e03/__tests__/e03.test.tsx` (+19 / -26) :
- le test n'utilise plus le faux serveur HTTP (`demarrerNoeud` + multipart reconstruit) ; `fetch` est remplacé par un appel direct à `creerDepotEnMemoire` (le même service et le même format de réponse `{ body: { resultats } }` que le handler `POST /pieces` du faux serveur) ;
- l'attente fixe de 300 ms est remplacée par une attente du résultat (50 ms × 100 au plus, arrêt sur alerte ou nouvelles lignes).
Aucun changement de code de production (`api.ts`, `Ecran.tsx`, `route.tsx`, textes) : le fond est inchangé.

## Vérifications au SHA de tête (Node 22)
- Tests ciblés `e03` + `deposer.test.ts` : 12/12. Fusion avec main sans conflit.
- Mutations (toutes rougissent, puis annulées) : branche « déjà reçue » neutralisée → `meme-fichier-deja-recue` ; phrase de refus remplacée par le texte inconnu → `executable-refuse-en-mots` ; `role="status"` retiré → 5 tests.
- Apport propre à la fiche : 8 fichiers, tous dans `fichiers_autorises`, sous 300 lignes. Aucun mot interdit, aucun prix ; données fictives.

## CI au SHA de tête
- `tests`, `e2e`, `lint`, `types`, `gitleaks`, `licences`, `stryker` : verts.
- `gardes` rouge (`garde:perimetre` : fichiers de L04-T33 et taille 470 > 300) : PR empilée sur #1058 (L04-T33), encore ouverte, fiche L04-T33 `a_faire`. Ce n'est pas un défaut de l'auteur. `verifier` est rouge pour cette seule raison.

## Remarques (non bloquantes)
- Avec le nouveau bouchon, `e03.test.tsx` ne vérifie plus ni l'URL `/pieces`, ni la méthode POST, ni la présence de la clé côté serveur (une clé vide passerait). `deposer.test.ts` couvre les lots et la clé, mais pas l'URL ni la méthode : une assertion sur `_u` et `o.method` dans le bouchon suffirait.
- Reprises de l'avis précédent : `role="status"` sur le `<ul>` (rôle de liste perdu), résultats perdus si un lot échoue après un lot accepté, ordre des résultats non vérifié, date UTC (`recueLe.slice(0, 10)`).
