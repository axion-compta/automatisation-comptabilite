VERDICT: OK
SHA relu: 68f1491b937f2dbc16f8ec4357382894e415e131

# Avis relec140-g01-948 — PR 948 (pilotage, fiche L11-T46, non sensible)

## Vérifications
- Diff : un seul fichier ajouté, `pilotage/fiches/L11-T46.md` (30 lignes, aucune ligne « - - »). Un seul commit.
- Cohérence avec L11-T45 : titre, phase P6, lot 11, couloir D, `exigences` (V3-MOT-061, V3-MOT-060), `criteres` (3 tests nommés, `pnpm garde:textes`, `pnpm verifier`), `taille_max_lignes: 60`, `tests_requis: oui` identiques. Seuls changent `depend_de: []`, l'ordre 46 et les noms de fichiers : la dépendance circulaire avec L11-T31 / PR 926 est levée.
- `fichiers_autorises` réels : `packages/textes/src/ecrans/` et son dossier `__tests__/` existent ; `e17-libelles-statuts.ts` et son test n'existent ni sur main ni dans une autre fiche. Le modèle `e17-frais.ts` existe et `e17.statuts` a bien les quatre clés citées (propose, valide, rembourse, enCompteCourant).
- Tests : trois tests nommés (`statut-brouillon-non-vide`, `statut-refuse-non-vide`, `statut-perso-non-vide`) exigeant un texte non vide et différent des quatre libellés de `e17.statuts` : ils rougissent si un libellé est vide ou reprend un statut existant.
- Compatibilité : `packages/textes/src/ecrans.test.ts` lit tous les `.ts` du dossier et exige un seul export objet, non vide, sans tutoiement ni espace en bord : le contenu prescrit (un seul `export const e17Statuts`) le respecte. Aucun des trois libellés n'existe déjà dans `packages/textes/src`.
- Conflits : L11-T41 touche `e17.ts` (non touché ici), L11-T31 touche `apps/web/src/ecrans/e17/*` (exclus ici, « Hors périmètre »). Aucun recouvrement.
- `node outils/gardes/fiches.mjs` : vert (894 fiches cohérentes, avertissements préexistants seulement).
- Aucun mot interdit, aucun prix, aucune donnée réelle.

## Remarques (non bloquantes)
- L11-T45 reste `statut: a_faire` sur main et prescrit le même export `e17Statuts` dans un autre fichier. Elle reste bloquée par sa dépendance à L11-T31, mais une fiche de pilotage suivante devrait la marquer abandonnée ou remplacée par L11-T46 pour éviter un doublon si L11-T31 fusionne un jour.
- L'étape 2 mentionne « différent de celui des quatre statuts » ; ajouter « et différents entre eux » renforcerait les tests, sans risque réel aujourd'hui.
