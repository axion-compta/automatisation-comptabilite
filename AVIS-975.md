VERDICT: A CORRIGER
SHA relu: f6b20c67f2ca27955f53ee25de2459ab73c8323d

PR 975, fiche L15-T58 (raccourcis d'une lettre et état du menu mémorisé, dans la coque), relecture Opus locale. CI : 9 contrôles verts.

Défaut :
1. Deux FournisseurPreferences imbriqués, donc deux états qui divergent. La coque monte désormais FournisseurPreferences (Coque.tsx:34). apps/web/src/ecrans/t05/Ecran.tsx:31 garde le sien, et son commentaire dit « à retirer quand la coque le fournit ». Sur l'écran T05 (Préférences), la désactivation des raccourcis écrit dans le fournisseur de T05. Celui de la coque garde l'ancienne valeur, et `reglage.current.actifs` reste vrai : les lettres restent actives jusqu'au rechargement, contre PR-R4 et `desactives-rien`. De plus, le bouton « Réduire le menu » appelle `memoriser(appareil, suite)` avec l'état périmé de la coque. Il réécrit alors toute la copie locale `axion.preferences.v1.bureau` et efface la valeur écrite par T05 (perte réelle hors ligne). Correction : amender la fiche pour autoriser `apps/web/src/ecrans/t05/Ecran.tsx` et retirer le fournisseur de T05, avec ses tests si nécessaire. Autre voie : autoriser `apps/web/src/donnees/preferences.tsx` et faire qu'un FournisseurPreferences imbriqué réutilise le contexte parent. Ajouter un test : désactiver dans T05 monté sous la coque, puis une lettre ne fait plus rien.

Vérifié :
- Périmètre : 8 fichiers, tous autorisés. 215 lignes, pour 280 permises. Clés de textes ajoutées sans renommage (navigation.reduire, navigation.agrandir).
- Le bouton « Réduire le menu » est dans `.menu-groupe`, hors de `nav.menu-bureau`, qui ne change pas. compteurs.test (liens `nav.menu-bureau a`, 6 entrées), coque.test (`bureau(h).querySelectorAll('a')`) et le e2e d'accessibilité (bouton « Plus » de la barre mobile) comptent des liens dans la nav, ou un autre bouton. Aucun ne compte le nouveau bouton, et la CI tests est verte.
- La media query mobile masque `.menu-groupe`. Largeurs 232 et 72 px en variables CSS de socle.css (pas de jeton existant).
- lettres.ts ignore Ctrl, Alt et Méta, les touches hors a-z, les input, textarea et select, contenteditable sauf « false », les dialog[open] et aria-modal, et les raccourcis désactivés. preventDefault n'est appelé que si une action agit. Le retrait des écouteurs est testé.
- Les 8 tests nommés sont présents (6 + 2). Ctrl+K reste actif quand les raccourcis sont désactivés.
- Aucun prix, aucun nom réel, aucun mot interdit.

Remarques (non bloquantes) :
- Coque.tsx:57-61 : les lettres sont calculées une seule fois au montage (`useEffect([])`). Un `remap` reçu ensuite du serveur, ou changé dans T05, n'est appliqué qu'au remontage. Si deux actions ont la même lettre, l'une écrase l'autre en silence.
- Menu réduit à 72 px : le bouton garde le texte long « Agrandir le menu » et les libellés sont coupés (overflow hidden). Une icône ou un libellé court pourra suivre.
