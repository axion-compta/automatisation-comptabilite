VERDICT: A CORRIGER

PR #1091, fiche L08-T53 (sensible : fusion par Will seul), relue au SHA de tête 4d782f7cd451adb42c329f567b3fa70836d1e751 (première relecture, relecteur Opus).

## Défauts

1. La fiche exige un message de refus égal au code, sans aucun détail sur la demande ni sur la personne (« À faire » 2 `refusPersonnes`, et le piège « Le motif d'un refus ne va dans aucun message d'erreur »). Aucun test ne le vérifie. Mutation faite sur `apps/serveur/src/domaines/personnes-acces.ts:33` : `message: verdict.code` remplacé par `message: 'detail ' + JSON.stringify(verdict)`. Les 9 tests restent verts.
   Correction demandée : dans `apps/serveur/src/__tests__/personnes-acces.test.ts:46`, `:53`, puis dans les tests 401 `REAUTHENTIFICATION_REQUISE` et `MFA_REQUIS`, vérifier le corps entier par `toEqual({ defined: false, code: X, status: S, message: X })` et pas seulement par `toMatchObject` sur une partie des clés.

## Vérifié et correct
- Périmètre : 7 fichiers, tous dans `fichiers_autorises` ; diff de 212 lignes pour une limite de 260. `app.ts`, `handlers.ts`, le contrat, `securite/` et `OPERATIONS_SENSIBLES` ne sont pas touchés.
- 9 tests nommés verts, `commun-personnes.test.ts` vert ; `node outils/gardes/fiches.mjs` : 1061 fiches cohérentes. Les tests de branchement existants (serveur et faux serveur) restent verts.
- L'identité vient seulement de `options.exploitation.identite` ; l'en-tête `x-role` est ignoré (401). Le contrôle se fait avant le service et avant `REGLAGE_ABSENT`. Dans `traiterDemande`, la permission est contrôlée avant la lecture du type : un refus est identique que la demande existe ou non.
- Ordre de `verifierAccesPersonnes` : 401 sans identité, puis 403 pour `personnel_axion` même avec la permission, puis 403 sans permission, puis 503 sans réglages, puis `exigerNiveau`. Une valeur invalide donne un refus, jamais 200.
- Mutations tuées : retrait du test `personnel_axion`, réauthentification neutralisée, `portabilite` retirée de `TYPES_AVEC_REAUTH`, 503 retiré, contrôle retiré de `traiterDemande`, `rechercherPersonne` ou `enregistrerDemande`.
- Données fictives (`JEU_SECURITE`, réglages inventés) ; aucun délai en dur dans le code. Journal de 9 lignes.

## Remarques (non bloquantes)
- `rectification-sans-reauth` (`:92`) attend `not.toBe(401)` ; la fiche dit 200. Un `toBe(200)` serait plus juste.
- « `maintenantMs` non entier » est joué avec une horloge illisible (NaN, `:116`), pas avec une vraie valeur décimale. Ce cas n'est pas atteignable par `Date.parse`, c'est acceptable.
- La fiche passe à `fait`, mais elle reste sensible : pas de mise en production sans J10.
