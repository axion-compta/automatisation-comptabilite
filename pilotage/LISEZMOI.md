# Pilotage des routines

Ce dossier pilote les routines automatiques (auteurs et relecteur) du dépôt. Données fictives seulement : aucun secret, prix ni nom réel.

## Contenu
- `fiches/LNN-TMM.md` : une fiche par tâche (format YAML en tête, puis contexte, à faire, hors périmètre, pièges).
- `journal/LNN-TMM.md` : journal de la fiche (10 lignes au plus), écrit par l'auteur.
- `consignes/auteur.md` et `consignes/relecteur.md` : textes donnés aux routines.
- `ARRET` : fichier d'arrêt d'urgence. Il est absent en fonctionnement normal.

## Choix
Une routine auteur choisit sa fiche ainsi :
1. Les fiches sont lues sur `origin/main`, jamais sur une branche.
2. Couloir de la routine, `statut: a_faire`, dépendances toutes à `statut: fait`.
3. Tri par `ordre` croissant.
4. La branche `lot-00/<id>` décide de la suite :
   - absente : réserver (`git switch -c`, commit vide, `git push -u`) ; push refusé = fiche suivante ;
   - présente avec une PR étiquetée `a-corriger` sans `bloque` : reprendre ;
   - présente sans PR et dernier commit de plus de 3 h : reprendre ;
   - sinon : sauter.

## Labels
`sensible-a-fusionner`, `fusion-will`, `relu`, `a-corriger`, `echec-1`, `echec-2`, `echec-3`, `bloque`.

## ARRET (arrêt d'urgence)
Au début de chaque exécution : `git fetch origin`, puis si `git cat-file -e origin/main:pilotage/ARRET` réussit, la routine s'arrête aussitôt sans rien écrire. Pour arrêter tout le pilotage, Will ajoute ce fichier sur `main` ; pour reprendre, il le supprime.

## Règle des 3 échecs
CI rouge après 2 corrections : label `echec-N` suivant et commentaire factuel, puis arrêt. Au 3e échec : label `bloque` et issue assignée à `will383842`. Une fiche bloquée n'est reprise que par Will.

## Fusion
Les PR sensibles (`sensible: oui`, ou diff touchant `.github/`, `LICENSE`, `scripts/verifier.mjs`, `.gitleaks.toml`, `.claude/`, `CLAUDE.md`, `eslint.config.js`, `tsconfig.base.json`, `CODEOWNERS`, `.npmrc`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, une dépendance, `outils/gardes/`, `scripts/pilotage/`, `pilotage/`) sont fusionnées par Will seul. Les autres le sont par le portier (L00-T21), en squash. Le seul contrôle obligatoire est la tâche CI `verifier`.

Limite connue : CODEOWNERS reste décoratif tant que `require_code_owner_reviews` n'est pas actif ; la parade est le workflow `alerte-fusion.yml` (L00-T09).
