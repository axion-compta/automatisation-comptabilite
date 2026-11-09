VERDICT: OK
SHA relu: 486141ef680a30a0dd1b958db1886cb59e550152
PR: 943 — L07-T27 Coque : bandeau d'état d'accès sur tous les écrans, liens vers le portail (déjà fusionnée au moment de la relecture : relue sur son SHA de tête)

## Vérifications
- Fichiers modifiés : 8, tous dans `fichiers_autorises` (`coque.test.tsx` inchangé).
- Taille : 210 lignes ajoutées, 1 retirée, limite de la fiche 280.
- CI du SHA de tête : verifier, types, lint, tests, e2e, gardes, gitleaks, licences, stryker tous verts.
- Tests locaux `apps/web/src/socle` : 68/68 verts.
- Mutations sur `BandeauAcces.tsx` : gravité limitée à SUSPENDU → rouge (`gravite-attention-pour-suspendu-et-resilie`) ; résumé retiré → rouge (`resume-de-reprise-affiche`).
- `liens.ts` : https seulement, `http:`, `javascript:`, `ftp:`, texte libre et variable vide ou absente → `null`, tous testés.
- Aucun secret, aucune adresse réelle (`portail.exemple.invalid`), aucun prix ni montant, aucun mot interdit, aucun octet NUL.
- Règle 13 (CONSIGNE-AUTEUR3) : adresse du portail lue dans une seule variable de construction, absente par défaut ; rien en dur.
- Aucune garde ni aucun test retiré. Journal : 7 lignes, commence par `# Journal L07-T27`.

## Remarques (non bloquantes)
- `bandeau-acces.test.tsx`, test `lien-du-portail-seulement-si-variable-https` : la seconde assertion n'échoue jamais (le scénario `suspendu` renvoie toujours le lien `contacter_axion`, car le service d'accès appelle `contenuBanniere(..., false)`). La mutation `href: null` à la place de `lienPortail('abonnement')` reste verte. Pas de risque aujourd'hui (le lien `portail_abonnement` n'est jamais émis tant que la console n'est pas branchée), mais à couvrir dans la fiche qui branchera le portail.
- Le test nommé `coque-existante-inchangee` n'existe pas sous ce nom ; l'exigence est tenue (les tests existants de la coque passent sans modification).
- La vérification `etat === 'ACTIF'` du bandeau double celle du serveur (bannière nulle en ACTIF) : mutation non détectée, mais sans effet.
