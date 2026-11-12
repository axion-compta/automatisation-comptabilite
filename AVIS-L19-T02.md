VERDICT: A CORRIGER

PR #1213 « L19-T02 Raccourci affiché dans l'infobulle des boutons ». Relecture Opus du 12/11/2026 (consigne LOT5, section R), au SHA de tête d6c81fde3ed88163dc07be50afbcf45aa4d2b9a9.

## Vérifié
- Diff limité aux 5 fichiers_autorises ; 179 lignes ajoutées pour 180 permises.
- Les 6 tests de bouton-raccourci et les 198 tests de packages/ui/src/composants sont verts (vitest, Node 22). Les tests existants de Bouton restent verts.
- Sans `raccourci`, le rendu est identique (vérifié par innerHTML exact).
- Journal : 9 lignes, commence par « # Journal L19-T02 ». Aucun mot interdit, aucun secret, aucun prix, aucune donnée réelle.
- e2e non relancé ici. La CI de la tête était encore « queued » au moment de la relecture (e2e, gardes, tests, etc.).

## Défauts
1. packages/ui/src/composants/Bouton.tsx:34-38 : avec `raccourci`, Bouton remplace les gestionnaires onFocus, onBlur, onKeyDown, onMouseEnter et onMouseLeave de l'appelant, puis les rappelle. Aucun test ne vérifie ces rappels. Ces mutations survivent (6 tests verts) :
   - retrait de `reste.onFocus?.(e)` : le onFocus de l'appelant est perdu sans qu'aucun test rougisse ;
   - Échap qui fait `return` avant `reste.onKeyDown?.(e)` : le onKeyDown de l'appelant est perdu sans qu'aucun test rougisse.
   Correction : un test qui passe des gestionnaires espions (focus, blur, keydown dont Échap, mouseenter, mouseleave) et vérifie que chacun est appelé une fois.
2. Bouton.tsx:37-38 : l'infobulle au survol est annoncée (commentaire du composant, corps de la PR) mais n'est pas testée. Retirer `montrer(true)()` de onMouseEnter, ou `montrer(false)()` de onMouseLeave, ne fait rougir aucun test.
   Correction : un test mouseenter → visible, puis mouseleave → masquée (avec `mouseover`/`mouseout`, que React écoute, en jsdom).

## Remarques
- apps/web/e2e/clavier.e2e.ts:43-44 : `await expect(bouton).toBeFocused();` est écrit deux fois. Supprimer le doublon libère une ligne pour les tests ci-dessus.
- La fiche dit « déposer un fichier ». L'e2e en dépose deux, pour contourner l'anomalie du faux serveur décrite dans le journal. L'anomalie est signalée honnêtement et est hors périmètre, mais il lui faut une fiche de suivi.
- Le chemin /documents/deposer est ouvert par `page.goto`, pas au clavier. C'est noté au journal ; acceptable.
- Taille : 179 sur 180. Les tests à ajouter dépasseront la limite. Factoriser (helper de montage, doublon e2e) ou demander une hausse de `taille_max_lignes` par la fiche, sans retirer de test.

SHA de tête relu : d6c81fde3ed88163dc07be50afbcf45aa4d2b9a9
