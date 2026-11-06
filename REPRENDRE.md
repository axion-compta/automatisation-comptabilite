# REPRENDRE : état à la sortie de la phase P0

Dépôt public, données fictives seulement : aucun secret, aucun prix. Lis ce bloc avant d'agir.

## Fait en P0
- Fiches L00-T00 à L00-T17 et L00-T19 à L00-T34 faites ; L00-T18 clôt la phase.
- CI en 8 tâches (types, lint, tests, gardes, e2e, gitleaks, licences, stryker) agrégées par la tâche `verifier`, seul contrôle obligatoire.
- Gardes dans `outils/gardes/` (fictif, couleurs, textes, actions, interrupteurs, appels, ci, perimetre, tests, termine, licences), lancées par `pnpm verifier`.
- Pilotage par fiches : `pilotage/LISEZMOI.md`, `pilotage/consignes/`, `pilotage/journal/`, avancement par `node scripts/pilotage/avancement.mjs`.

## Preuve : un faux secret est bloqué
- Méthode : dépôt Git jetable, hors de ce dépôt, contenant une fausse clé d'accès de forme AWS (assemblée à l'exécution, jamais écrite dans ce dépôt), validée avec la configuration `.gitleaks.toml` du dépôt.
- Résultat du 06/11/2026 : `gitleaks git --config .gitleaks.toml .` signale 1 fuite (règle `aws-access-token`) et sort en code 1 ; sur ce dépôt-ci, le même contrôle sort en code 0.
- En CI, la tâche `gitleaks` fait partie des `needs` de `verifier` : un résultat rouge bloque la PR. Le faux secret n'a jamais été poussé ni proposé à main.
- Limite : preuve locale avec le même outil et la même configuration, non rejouée en CI par une PR piégée (elle exposerait la fausse clé dans l'historique public).

## Mesure de la CI
- Durées de bout en bout des 6 dernières exécutions vertes sur main : 46, 47, 47, 64, 69 et 495 s (la valeur de 495 s est une exception, probablement une attente de machine).
- Par tâche (exécution de la PR L00-T24) : de 5 s à 42 s ; la plus longue est `e2e`. Critère « CI < 15 min » tenu, avec une marge d'environ 14 minutes.

## Reste à faire
- Phases suivantes : voir `pilotage/fiches/` (pas de fiche libre en P0 une fois L00-T18 fusionnée).
- Will fusionne les PR sensibles ; le portier (L00-T21) fusionne les autres.
- Test `regle-eslint` de `packages/noyau` : peut dépasser 5 s en local, sans lien avec P0.

## Prochaine commande
`git fetch origin && node scripts/pilotage/avancement.mjs`, puis `pnpm install --frozen-lockfile && pnpm verifier`.

## Pièges
- Ne jamais écrire de faux secret en clair dans un fichier suivi : gitleaks le bloquerait.
- Ne jamais fusionner depuis une session auteur.
- Écrire les fichiers avec un outil d'édition, jamais d'octet NUL.
