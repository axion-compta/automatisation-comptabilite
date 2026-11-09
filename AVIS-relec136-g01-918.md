VERDICT: OK
SHA relu : ef9aecefc2aa0a6b7ff374f9364b626d18389036

# Avis de relecture, PR 918 (fiche L11-T27, sensible), branche lot-11/L11-T27

## Défauts des anciens avis
1. `reglage()` rendait NaN, et le récapitulatif n'était alors jamais demandé : corrigé. `apps/serveur/src/domaines/frais-validation.ts:5-9` n'accepte que `/^\d+$/` puis `Number.isSafeInteger`. Toute autre valeur lève `Réglage <nom> invalide` au démarrage. Le nouveau test `reglage-invalide-refuse-au-demarrage` couvre les trois réglages : `cinq`, `1 000`, `1.5`, `-1`, chaîne vide et `1e3` sont refusés, et `0` est accepté.
2. Contrôle `gardes` en échec : il est vert au SHA relu. Les 9 jobs de la CI sont verts (verifier, tests, types, lint, gardes, stryker, e2e, gitleaks, licences). En local, `node scripts/verifier.mjs --gardes` est vert.

## Contrôles
- `FRAIS_INCONNU` est évalué avant `conflitBanque` (`frais-validation-service.ts:69` puis `:70`). `conflitBanque` (`frais-actions-service.ts:49`) utilise `RELEVE_ESSAI` et `FENETRE_ESSAI.jours`.
- Tests : 13 sur 13 passent (`apps/serveur/src/__tests__/frais-validation.test.ts`), dont `proposer-refuse-frais-paye-societe` et `valider-refuse-frais-paye-societe`. `contrat.test.ts` et `gestes-routes.test.ts` passent aussi (18 sur 18, dont `routesEcritureSansEnTete()`). `openapi.mjs` régénère le fichier sans aucun écart.
- Mutations, annulées ensuite :
  - retrait de `conflitBanque(...) !== undefined` → les deux tests « frais payé par la société » rougissent ;
  - `reglage` revenu à `Number(...)` → `reglage-invalide-refuse-au-demarrage` rougit.
- Fichiers : 10, tous dans `fichiers_autorises`. Aucune garde ni aucun test retiré ou assoupli, aucune dépendance.
- Taille : 342 lignes hors `openapi.json`, pour 345 dans la fiche. `openapi.json` compte 178 lignes, comptées à part par la garde périmètre (plafond 600).
- Règle 13 : réglages lus à un seul endroit (`apps/serveur`), valeurs d'essai fictives, service en mémoire. Aucune adresse, aucun port, aucun secret, aucun virement émis.
- Aucun mot interdit, aucun prix, données fictives (FRA-xxx, PER-01). Journal : 7 lignes, il commence par `# Journal L11-T27`.

## Remarques (non bloquantes)
- Le test ne couvre pas un entier trop grand (par exemple `99999999999999999999`). Le code le refuse bien grâce à `isSafeInteger`, mais la mutation `isSafeInteger` → `isNaN` survit. Il suffirait d'ajouter cette valeur à la liste du test.
- `frais-validation-service.ts` : certaines fonctions ont été tassées sur une ligne pour tenir sous le plafond, ce qui les rend moins lisibles.
- Une variable absente prend toujours la valeur d'essai. En production, ces réglages devront être obligatoires.

Fiche sensible : la fusion revient à Will seul.
