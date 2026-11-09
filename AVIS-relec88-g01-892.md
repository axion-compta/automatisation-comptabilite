VERDICT: OK
SHA relu: a2444358a80676e533fe48161be229198521ccf0

# Avis relec88-g01-892 : PR 892, fiche L02-T57 (E12 Ma banque : comptes)

Branche relue : `lot-02/L02-T57`.

## Vérifications
- Fichiers modifiés : 7, tous dans `fichiers_autorises`.
- Taille : +297 / -1, sous `taille_max_lignes` (300). Aucune ligne « - - » dans numstat.
- Tests : `e12.test.tsx` passe (9 tests : les 7 nommés par la fiche, plus `cas-limites` et `montant-negatif-avec-signe`). `apps/web/src/socle` passe aussi (62 tests au total).
- Mutations : 6 essais, tous détectés par au moins un test rouge, puis annulés.
  - RAPPROCHEE passée en « ok » : `rapprochee-n-est-pas-validee` rougit.
  - Pastille affichée avec le code brut : `lignes-avec-etat-en-mot` et 2 autres tests rougissent.
  - Correspondance `acces_refuse` retirée : `etat-erreur-403` rougit.
  - `replaceState` retiré : `filtre-dans-l-url` rougit.
  - `?etat=` pris sans validation : `cas-limites` rougit.
  - Filtre `etat` absent de l'appel : 5 tests rougissent.
- Gardes vertes : textes, appels, couleurs, fictif, actions, tests, perimetre. Les gardes sont lancées par `node` direct, car le Node du cloud est en version 22.
- `tsc --noEmit` vert sur `apps/web` et `packages/textes`, eslint vert sur les fichiers de la PR.
- `pnpm verifier` : seule l'étape « types » échoue, sur le refus de version Node par pnpm (environnement), sans lien avec la PR. Les tests (685 fichiers) et les gardes sont verts.
- Textes : tous dans `packages/textes/src/ecrans/e12.ts`, au vouvoiement, sans « lettrage ».
- Pas de `<main>`. Les schémas sont importés de `packages/contrat/src/domaines/banque.ts`.
- Aucun mot interdit, aucun prix. Aucun IBAN : la PR n'en contient pas, ni en clair ni masqué (le test vérifie seulement un motif `FR*…0001`).
- Journal : 6 lignes, commence par `# Journal L02-T57`.

## Remarques (non bloquantes)
- `route.tsx:9` : `groupe: 'menu'` au lieu de `'banque'` (fiche, point 1). Le type `DefinitionEcran` n'accepte pas `'banque'` (seulement `'menu'`, `'reglages'` ou `'autre'`). Le choix est donc forcé, et le journal l'explique.
- `e12.ts:4` : `comptes.soldeNegatif` est défini mais jamais utilisé. Le solde négatif d'une carte prend le libellé « Montant négatif » du tableau. Il faudra choisir l'un ou l'autre plus tard.
- `e12.test.tsx` (`titre-h1-unique`) : le format téléphone (360 px) n'est simulé que par `innerWidth`. jsdom ne calcule aucune mise en page, donc la vérification reste faible.
- Le filtre par compte et la pagination ne sont pas testés. La fiche ne l'exige pas.
