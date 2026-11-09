VERDICT: OK
SHA relu : 7028cec30e8cf9e8a80ececfbd034d36a00e7585
PR : 936 — fiche L05-T53 — branche lot-05/L05-T53 — sensible : non

## Contrôles
- Fichiers modifiés : 9, tous dans `fichiers_autorises`.
- Taille : 219 lignes (max fiche 260, max dépôt 400) ; aucune ligne « - - ».
- Journal `pilotage/journal/L05-T53.md` : 7 lignes, commence par `# Journal L05-T53`.
- Tests : `apps/web/src/socle` + `apps/web/src/ecrans/m04` : 6 fichiers, 66 tests verts ; les 8 tests nommés présents ; tests existants de la coque verts.
- Test retiré `discuter-ouvre-la-palette` : remplacé par `discuter-ouvre-m04`, changement de comportement demandé par la fiche ; la palette reste testée (`ctrl-k-ouvre-toujours-la-palette`, `palette-navigue-par-le-routeur`). Pas d'affaiblissement.
- `tsc --noEmit` (apps/web) vert ; `node scripts/verifier.mjs --gardes` : tout est vert (21 étapes).
- Mutations (toutes rougissent un test puis annulées) : « Discuter » vers `/` ; lecture du stockage toujours fausse ; `try/catch` de lecture retiré ; retour M04 vers `/` au lieu de l'historique ; `hidden` retiré du corps de colonne.
- M04 découvert par dossier (`import.meta.glob('../ecrans/*/route.tsx')`), chemin `/discussion`. Stockage local dans `try/catch`. Aucun texte en dur (textes `e25`, `socle`), cibles à `--cible-min`.
- Aucun secret, aucune adresse, aucun prix, aucun mot interdit.

## Remarques (non bloquantes)
- `apps/web/src/ecrans/m04/Ecran.tsx:10` : `router.history.back()` sort de l'application si `/discussion` est ouvert directement (pas de page précédente) ; prévoir un repli vers `/` dans une fiche suivante.
- `Coque.tsx` : la colonne (et donc `Discussion`) reste montée sous 720 px, seulement masquée en CSS ; à surveiller si `Discussion` lance des lectures au montage.
