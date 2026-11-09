VERDICT: A CORRIGER
SHA relu : 9a446ebe180847c2ecc14711e2dde9ed2d167a4c

Relecture de la PR #918 (fiche sensible L11-T27, branche lot-11/L11-T27).

Défaut (bloquant, fiche sensible : contrôle humain de la validation)
1. apps/serveur/src/domaines/frais-validation.ts:5 et :13-15 : `reglage` rend `Number(process.env[nom] ?? essai)` sans contrôle. Une variable mal saisie (`FRAIS_SEUIL_LOT_NOMBRE=cinq`, `FRAIS_SEUIL_LOT_MONTANT=1 000`) donne `NaN` ; dans packages/contrat/src/domaines/frais-validation-service.ts:102, `lot.length > NaN` et `total > NaN` valent `false`, donc `RECAPITULATIF_A_CONFIRMER` n'est plus jamais demandé : un lot de 100 frais est validé sans récapitulatif, en silence. Vérifié à la main (`Number('cinq')` → NaN → comparaison fausse).
   Correction demandée : `reglage` refuse au démarrage toute valeur qui n'est pas un entier positif ou nul (`Number.isSafeInteger(n) && n >= 0`, sinon erreur explicite), et un test qui fait rougir ce cas (valeur non numérique, `1.5`, négative). Même contrôle pour `FRAIS_DELAI_ANNULATION_MS`.

Vérifié, sans défaut
- Fichiers modifiés : 10, tous dans `fichiers_autorises`. Taille : 334 lignes hors openapi.json (compté à part par la garde) pour 345 permises ; moins de 400.
- Point propre : `construire` évalue `FRAIS_INCONNU` avant `conflitBanque` (ligne `?? refuser('FRAIS_INCONNU')` puis le test banque) ; `conflitBanque` (L11-T44) garde `FENETRE_ESSAI` et `RELEVE_ESSAI`, sur le jeu partagé de app.ts, aucun `genererFrais()` de plus côté serveur. Tout le lot est contrôlé avant la première écriture.
- Mutations : retrait de `conflitBanque(jeu, id) !== undefined` → `proposer-refuse-frais-paye-societe` et `valider-refuse-frais-paye-societe` rougissent ; retrait de la condition `confirmeRecapitulatif` → `valider-lot-au-dela-du-seuil-recapitulatif` rougit ; écriture partielle d'un frais du lot avant refus → les tests rougissent. Inverser l'ordre inconnu/banque ne change rien (mutant équivalent : `conflitBanque` rend `undefined` pour un id inconnu).
- Critères : 12 tests du fichier verts (10 nommés + 2) ; `pnpm contrat:openapi` sans écart ; `routesEcritureSansEnTete()` reste [] (tests contrat verts) ; `pnpm verifier` vert (24 étapes) ; CI verte au SHA relu (verifier, tests, types, lint, gardes, stryker, e2e, gitleaks, licences).
- `validerFrais: 'G01'` ajouté à `ROUTES_A_GESTE` sans retirer d'entrée ni de verbe ; aucune garde ni test affaibli.
- Règle 13 : aucune adresse, machine, port ni secret ; réglages lus dans apps/serveur seulement ; service en mémoire ; remboursement `propose`, aucun champ de paiement émis.
- Aucun mot interdit, aucun prix, données fictives (FRA-xxx, PER-01). Journal : 7 lignes, commence par `# Journal L11-T27`.

Remarques (non bloquantes)
- Variable absente = valeur d'essai : en production, prévoir de rendre ces réglages obligatoires lors du branchement de la configuration datée.
- Branche en retard sur main : la remettre à jour avant fusion (fichiers communs routes.ts, app.ts, openapi.json).
