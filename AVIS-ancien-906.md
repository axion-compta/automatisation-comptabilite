VERDICT: A CORRIGER

PR 906 — pilotage/L09-T48-deblocage — fiche L09-T48 (sensible)
SHA relu : 790f196e681a10cc46a6546693a7bec9de886701

## Ce qui va
- Diff : 1 fichier (`pilotage/fiches/L09-T48.md`), 2 ajouts, 1 suppression ; en-tête YAML identique à origin/main.
- Blocage levé par D42 (serveur d'Axion IA, base séparée) et D29 ; J3a rappelé avec ses quatre conditions ; rien sur J10, D43, Q*, contact prestataire ni vraies données.
- Point 4 ajouté fidèle à la règle 13 de CONSIGNE-AUTEUR3.md. Dépendances toutes `fait`.
- `node outils/gardes/fiches.mjs` : 891 fiches cohérentes. Aucun mot interdit, aucun prix.

## Défaut
1. `pilotage/fiches/L09-T48.md:20` : la ligne remplacée contenait aussi « l'emplacement exact des migrations et du dépôt de données sera fixé à ce moment (les chemins ci-dessous sont provisoires et seront corrigés dans la fiche avant exécution) ». Cette réserve disparaît alors que les chemins n'ont pas été corrigés :
   - `fichiers_autorises` donne `apps/serveur/migrations/0901-profil.sql`, mais le dossier des migrations du dépôt est `apps/serveur/src/base/migrations` (`DOSSIER` de `outils/gardes/migrations.mjs`, migration existante `080-exploitation-rgpd.sql`). Une migration écrite au chemin de la fiche échapperait à garde:migrations (contrôle « ajout seul »), sur une fiche sensible de base de données.
   - `apps/serveur/src/depot/` n'existe pas (les dépôts sont sous `apps/serveur/src/base/` ou `apps/serveur/src/banque/`).
   - Les tables `societe`, `regime_tva_societe` et `parametre_date` auxquelles la fiche ajoute des champs n'existent dans aucune migration de main.
   Correction demandée : garder la réserve sur les chemins provisoires (la fiche reste alors non planifiable) OU, dans une PR de fiche, corriger `fichiers_autorises` vers `apps/serveur/src/base/migrations/…` et un dépôt sous `apps/serveur/src/base/`, et préciser d'où viennent les tables `societe`, `regime_tva_societe`, `parametre_date`, avant de débloquer.
