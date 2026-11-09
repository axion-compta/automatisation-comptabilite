VERDICT: OK
SHA relu : 5c333f86297225c3adacb310a99b9f9dd0855530

Fiche L15-T53, PR 962 (déjà fusionnée), relue au SHA de tête contre la base 69605cb725, fiche lue sur cette base. Constat identique à l'avis précédent.

## Contrôles
- 8 fichiers, tous dans `fichiers_autorises` ; 189 ajouts / 6 retraits (max 280) ; aucune nouvelle dépendance, rien sous `.github/` ni dans les gardes.
- Textes dans `packages/textes/src/ecrans/socle.ts` (`cloche`, `compteur.*`), aucune clé renommée. Aucun mot interdit, aucun prix, aucune donnée réelle.
- Journal 8 lignes, commence par `# Journal L15-T53`.
- Cas limites : `CompteurSchema` (packages/contrat/src/domaines/alertes.ts:36-40) n'accepte que des entiers positifs ou nuls, validés par `safeParse` côté web : négatif, NaN, Infinity, non entier refusés ; rien n'est affiché à zéro ni sans compteur.
- Accessibilité : `role="img"` et `aria-label` complet (« 3 alertes, dont une urgente »), nombre et « ! » masqués aux lecteurs d'écran ; bouton de la cloche avec texte visible, `aria-haspopup="dialog"`, `aria-expanded`, cible ≥ `--cible-min`.
- Isolation entre sociétés : compteurs lus par exercice, par la même clé de lecture que le reste.
- CI verte (9/9) au SHA relu.

## Tests
- `compteurs.test.tsx` : 7/7 (les 7 tests nommés) ; `src/socle` : 10 fichiers, 101 tests verts.
- `pnpm verifier` : lint, tests, gardes verts ; « types » relancé à la main (`pnpm -r exec tsc --noEmit`) vert (le script exige Node 24, le cloud a Node 22).
- Mutations, toutes annulées : affichage à zéro → rouge ; « dont une urgente » retiré → rouge ; écoute `ouvrir-cloche` retirée → rouge ; clic de la cloche neutralisé → rouge ; `etat !== 'erreur'` remplacé par `true` → vert, mutation équivalente (à l'état « erreur », les données sont vides).

## Défauts
Aucun.

## Remarques
- apps/web/src/socle/Compteur.tsx:23-24 : sans exercice ouvert (ou pendant le chargement), la requête vise `/exercices/_/compteurs` toutes les 30 s : 404 répétés. Désactiver la requête sans exercice.
- apps/web/src/socle/Compteur.tsx:31 : `ouvertes: 0` avec `pointExclamation: true` affiche « 0 ! » ; n'afficher que le « ! » dans ce cas.
- apps/web/src/socle/Compteur.tsx:33 : grands nombres non plafonnés (pas de « 99+ »).
- apps/web/src/socle/BarreMobile.tsx : sur téléphone, « Plus » ne signale pas les alertes des entrées du panneau (hors fiche).
- apps/web/src/socle/__tests__/compteurs.test.tsx:33 : délai fixe de 400 ms, risque d'instabilité.
