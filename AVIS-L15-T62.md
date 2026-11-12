VERDICT: OK
PR #1114, SHA de tête 1e31a407b2abe294a815afe5fec861a075e3ed37

Amendement de la fiche L15-T62 (branche `pilotage/amende-L15-T62`). La fiche est sensible (argent) : fusion par Will seul.

## Contrôles
- Un seul fichier change : `pilotage/fiches/L15-T62.md` (+15, -10). La CI est verte au SHA de tête (verifier, gardes, tests, types, lint, e2e, stryker, gitleaks, licences). `node outils/gardes/fiches.mjs` est vert en local.
- J'ai vérifié sur main chaque fait cité par la nouvelle fiche :
  - `packages/contrat/src/chat/outils.json` compte bien 7 outils ; aucun ne couvre les 11 `actionPrincipale` de `CATALOGUE_MVP` (ALR-01 à ALR-11, `payer_facture` = ALR-09, nature `argent`) ;
  - la branche `bloque/L15-T62` existe ;
  - les symboles et valeurs cités existent : `lecturesParPostLot15` (vide), tags `lecture-par-post` / `sans-effet` / `acces:lecture` (modèle : `recherche.ts`), `OptionsModules`, `creerServiceAlertes` (avec `lister()` et `journal()`), état `resolue_auto`, codes `ALERTE_INCONNUE`, `ROLE_INSUFFISANT`, `CONFLIT_VERSION`, `ALERTE_INACTIVE`, `EXERCICE_INCONNU` ;
  - les permissions `compta-lire` et `compta-valider` sont celles du noyau des alertes.
- Le périmètre se réduit sans perdre de sécurité : `actions/registre.json` sort des `fichiers_autorises`, aucune écriture, aucun paiement, aucun envoi. ALR-09 reste une proposition avec `compta-valider` exigé. Un critère vérifiable interdit de toucher `chat/outils.*`, `registre.json` et `.github/`.
- Chaque critère est vérifiable : tests nommés avec ce qui doit les faire rougir, `contrat:openapi` sans écart, `pnpm verifier`.
- Aucun mot interdit, aucun prix, aucun nom réel, aucune adresse ni aucun secret.

## Remarques (non bloquantes)
- Décision à confirmer par Will à la fusion : AL-R4 (exécution par le circuit des outils, `avant`/`apres`, auteur, annulation de 10 s) est remplacé par un lien d'ouverture. La fiche dit que Will a « laissé le concepteur trancher le 12/11/2026 » ; le relecteur ne peut pas le vérifier. V3-UX-103 n'est couvert qu'en partie, et la reprise de l'exécution n'a pas encore de fiche suivante.
- `creerServiceAlertes` n'a pas de méthode `lire(id)` : le port `lire(id)` par défaut doit être un adaptateur sur `lister()`, dans `apps/serveur/src/domaines/alertes-resoudre.ts`, sans toucher `alertes-service.ts`. On peut l'écrire tel quel dans la fiche pour éviter que l'auteur se bloque de nouveau.
- `garde:fiches` avertit : L15-T62 et L16-T10 partagent les registres du lot 15 (lots différents, simple avertissement).
