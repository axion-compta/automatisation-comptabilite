VERDICT: A CORRIGER
7089fca215a2259e8e215a32b755f043c4bfa856

Fiche: L06-T48 (SENSIBLE) - PR #1071 - SHA de tête relu : 7089fca215a2259e8e215a32b755f043c4bfa856
Troisième relecture (relecteur Opus, lot 5 section R, 12/11/2026), après l'avis A CORRIGER du SHA a03de4b9554f0058b2beba9444d5529a8e1922b3. La fiche est sensible : la fusion revient à Will seul.

## Défaut de l'avis précédent : taille, corrigé
- Lignes propres à la fiche : `signalements.ts` 97, `signalements.test.ts` 133, fiche 2, journal 8. Total **240 ≤ 250**.
- Aucun test retiré : les 11 mêmes tests, 29 `expect` avant comme après. Le changement `ligneParam(NB_JOURS)` sans `dateEffet` est équivalent (la valeur par défaut est `2026-01-01`).
- `vitest run apps/serveur/src/__tests__/signalements.test.ts` : 11/11 verts.

## Défaut bloquant (nouveau, introduit par la réduction de taille)
1. `apps/serveur/src/securite/signalements.ts:45` : `const s: Signalement = { ...demande, signalementId: ..., etat: 'ouvert', creeLe: ... }`.
   - Avant (a03de4b9), les 4 champs étaient recopiés un par un. Maintenant, **toute clé en trop de la demande est enregistrée** dans le signalement. TypeScript ne l'empêche pas quand la demande vient d'une variable d'un type plus large.
   - Sonde : une demande avec `ecritureId: 'ecr-1'` donne un signalement stocké avec la clé `ecritureId`. Cela casse la règle de la fiche « aucune clé vers les écritures » (spec 06, P8).
   - Le test `erreur-et-signalement-meme-correlation` ne le voit pas : il n'envoie que les 4 champs. La mutation qui ajoute une clé au spread fait bien rougir ce test, mais une clé venue de la demande passe.
   - Une mise à niveau ne doit pas changer le comportement.
   - Correction demandée :
     - revenir à la recopie explicite `societeId: demande.societeId, personneId: demande.personneId, nature: demande.nature, correlationId: demande.correlationId` ;
     - dans `erreur-et-signalement-meme-correlation`, ajouter un appel avec une demande portant une clé en trop (par exemple `ecritureId`), puis vérifier que les clés de la ligne restent exactement les 7 attendues. Ce test doit rougir avec le spread.
   - Taille : environ +3 lignes, il reste de la marge (240 sur 250).

## CI au SHA de tête
- `gardes` et `verifier` sont rouges pour la seule `garde:perimetre`. Reproduit en local : fichiers hors liste de L06-T39 et taille 391 > 250. Tout vient de L06-T39 (#1052, empilée, encore ouverte) : ce n'est pas un défaut de l'auteur. Une fois #1052 fusionnée, il reste 240 lignes.
- `garde:termine` est verte. tests, lint, types, e2e, gitleaks, licences et stryker sont verts.

## Autres contrôles
- Fichiers propres : 4, tous dans `fichiers_autorises`. Journal 8 lignes, commence par « # Journal L06-T48 ».
- Aucune durée en dur, aucun prix, aucun secret, aucun mot interdit ; données fictives.

## Remarques (non bloquantes, reprises)
- Si `parametre.lire`, `alerter` ou `lister` lève pour une société, la purge s'arrête pour les sociétés suivantes.
- `societes` est figé au moment de l'inscription.
- `dateEffet` est comparé en texte.
- Pas d'interface pour les Demandes du portail (V3-SUP-010) ; pas de colonne `correlation_id` dans la table 092.
