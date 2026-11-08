VERDICT: OK
SHA relu : 79239c2bc9fc5b1db631f794384ec8bb7aebf260 (PR 869, base ee6d86f ; contenu identique à f8f7c14 sur main)

PR de fiche : seul `pilotage/fiches/L00-T61.md` est modifié (+7/-6).

Vérifications
- Fiche valide : 15 champs (id … criteres), tous les champs tableau sont du JSON valide ; `node outils/gardes/fiches.mjs` : 887 fiches cohérentes, code 0.
- `fichiers_autorises` : ajout de `apps/web/e2e/traceurs.e2e.ts` seulement ; aucun autre élargissement ; `nouvelles_dependances: []`.
- Correctif suffisant : reproduit hors dépôt avec la logique de `chemins()`. Sans filtre, un dossier `ecrans/e01/` ne contenant que `.gitkeep` donne ENOENT (cause de la PR 861). Avec `.filter((d) => existsSync(join(src, dossier, d.name, fichier)))`, la liste rendue est identique à l'actuelle (6 chemins : tiers, activite, informations, annees, comptes, preferences). Le nom de fichier vient toujours du motif lu dans `ecrans.ts`, donc aligné sur `import.meta.glob('../ecrans/*/route.tsx')`, qui ignore lui aussi ces dossiers.
- Aucun écran ayant un `route.tsx` n'est dispensé : le filtre ne retire que les dossiers sans fichier de route ; le test « la découverte trouve des chemins » (longueur > 0, préfixe `/`) et les tests traceurs restent inchangés pour eux.
- Autres lecteurs de `ecrans/` (garde `portes.mjs`, `routeur.test.tsx` via glob) : non touchés par les dossiers `.gitkeep`.
- `taille_max_lignes: 80` cohérente : 5 portes (~25 l.), 5 `.gitkeep` vides, journal ≤ 10, fiche (statut) ~2, `traceurs.e2e.ts` ~2-3 ⇒ environ 45 lignes.
- Aucun mot interdit, aucun prix, données fictives.

Remarques (non bloquantes)
- La PR est déjà fusionnée sur main (f8f7c14) : avis rendu a posteriori.
- Le critère « le job e2e reste vert » n'est pas une commande lançable telle quelle ; l'auteur devra citer `pnpm --filter web e2e` (ou la commande du job CI) dans son journal.
- Préciser dans la PR d'exécution que le filtre se place avant le `.map` (sinon le `readFileSync` lève avant le filtre).
