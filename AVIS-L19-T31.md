VERDICT: OK

PR #1219, fiche L19-T31. Première relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : a90a87b8d0cf9eb171a482ecf24ec018f78cf33a

## Vérifié
- 8 fichiers, tous dans `fichiers_autorises` ; 249 lignes ajoutées sur 250 permises ; aucune ligne « - - » ; aucune dépendance ajoutée ; aucun écran existant touché.
- Les 7 tests nommés de la fiche sont présents, plus un test de validation : 8 sur 8 verts (`packages/ui`). CI verte au même SHA (9 contrôles).
- `garde:couleurs` est vert. Les 19 variables CSS utilisées existent dans `jetons.css`, aucune couleur n'est écrite en dur.
- `BandeauEtat` : rôle `alert` pour la panne, `status` sinon. Chaque niveau a son icône, accompagnée de texte. Le bouton d'action est de type `button`.
- `FeuilleMobile` : `role="dialog"` et `aria-modal`. Le focus est piégé (Tab et Shift+Tab bouclent). Échap et le voile ferment la feuille. Le focus est rendu au déclencheur à la fermeture comme au démontage.
- Journal court, commence par « # Journal L19-T31 ». Aucun secret, prix, nom réel ni mot interdit.

## Mutations (toutes tuées)
- Bouclage du focus retiré : `feuille-focus-piege` rougit.
- Bouclage retiré à Shift+Tab seul, avec la fermeture par le voile : `feuille-focus-piege` et `feuille-voile-ferme` rougissent.
- Retour du focus retiré : `feuille-focus-rendu` rougit.
- Rôle de la panne changé en `status` et Échap remplacé par « Esc » : les tests correspondants rougissent.

## Remarques (non bloquantes)
- `FeuilleMobile.tsx:47` : le voile prend sa couleur dans `--couleur-texte` à 0.4. Un jeton dédié serait plus clair, mais ce serait l'objet d'une autre fiche.
- `BandeauEtat.tsx:15-16` : le composant lève une erreur à l'affichage si le texte est vide ou le niveau inconnu, comme les composants existants.
