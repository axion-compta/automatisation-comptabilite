VERDICT: OK
SHA relu : ce21a29cae5e514f9fdc6381b243be13ea930a1b

PR 956, fiche L07-T30 (porte d'acceptation des documents contractuels).

## Contrôles
- Fichiers : les 7 fichiers modifiés sont dans `fichiers_autorises`.
- Taille : 231 lignes (numstat, aucune ligne « - - ») pour un maximum de 280.
- Tests : les 8 tests nommés existent (7 dans porte-acceptation.test.tsx, `menu-toujours-visible` dans coque.test.tsx) ; 25/25 verts en local sur ce SHA.
- Mutations (PorteAcceptation.tsx, chacune annulée ensuite), toutes détectées :
  - retrait de `await relire()` : rougit `accepter-puis-ecran-demande` et `version-perimee-message-et-relecture` ;
  - retrait de `CHEMINS_TOUJOURS_OUVERTS` : rougit `mes-donnees-toujours-ouvert` ;
  - bouton actif sans case : rougit `bouton-desactive-sans-case` ;
  - erreur de lecture qui bloque : rougit `erreur-de-lecture-ne-bloque-pas` ;
  - message générique au lieu du code 409 : rougit `version-perimee-message-et-relecture`.
- Isolation entre sociétés : sans objet côté écran (lecture par `useLecture`, aucun identifiant de société en dur) ; le blocage serveur reste hors périmètre (L07-T37).
- Textes : tous dans `packages/textes/src/ecrans/acceptation.ts`, aucun texte en dur dans les .tsx, aucun texte de CGV.
- Mots interdits, prix, secrets, données réelles : aucun.
- Journal : 6 lignes, commence par `# Journal L07-T30`.
- CI au SHA relu : 9 contrôles verts (verifier, types, lint, tests, gardes, e2e, gitleaks, licences, stryker) ; PR fusionnable sans conflit.

## Remarques (non bloquantes)
- apps/web/src/socle/PorteAcceptation.tsx:30 : un seul document affiché à la fois (`documents[0]`), les suivants après relecture ; le parcours aboutit bien, mais la fiche dit « pour chaque document ». À garder en tête si plusieurs types arrivent.
- apps/web/src/socle/PorteAcceptation.tsx:45 : la relecture a lieu aussi après une erreur autre que 409 ; sans effet nuisible.
