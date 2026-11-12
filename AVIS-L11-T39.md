VERDICT: OK

# Avis L11-T39 (PR #1131), seconde relecture

SHA de tête relu : ae59a6b846540bc67cf7b90ab80fc25f5a53a527
Avis précédent : A CORRIGER au SHA 5856c35554ff89213802e2a7cda2765b377495ea (2 défauts). Fiche lue sur la branche de la PR (décision de Will du 12/11/2026 : interface + faux fournisseur, données fictives).

## Contrôles
- Fichiers : les 9 fichiers du diff `origin/main...HEAD` sont dans `fichiers_autorises` ; le merge de main n'ajoute rien au diff.
- Taille : `garde:perimetre` vert, 257 lignes + 70 lignes d'openapi.json.
- CI au SHA de tête : 9 jobs verts (verifier, tests, e2e, lint, gitleaks, stryker, gardes, types, licences).
- Tests ciblés : contrat 9/9 verts, serveur 1/1 vert.
- Aucun mot interdit ni prix dans les lignes ajoutées ; données fictives. Journal : 9 lignes.

## Défauts précédents : vérifiés par mutation
| Défaut | Mutation | Résultat |
|---|---|---|
| 1. confiance non vérifiée | statut calculé sur `manquants.length === 0` seul | rouge (`lecture-incertaine-complete-a-completer`) |
| 2. distance invalide | retrait de `d.kmDixiemes >= 0` | rouge (`distance-invalide-du-fournisseur-ignoree`) |
| 2. distance invalide | retrait de `Number.isInteger(...)` | rouge |
| 2. distance invalide | `Number.isInteger` remplacé par `Number.isFinite` | rouge |

Les deux défauts sont levés.

## Remarques (non bloquantes)
- `BANQUE_ESSAI` reprend maintenant `FENETRE_ESSAI.jours`. La carte fictive `4242` reste codée en dur, parce que la reprendre du jeu de `creerFrais` demanderait de modifier `frais-actions.ts`, qui est hors périmètre.
- Date sentinelle `2000-01-01` : laissée volontairement, le payeur reste « à confirmer ».
- Raccord direct vers `creerFrais` : défaut de fiche (`frais-actions.ts` est hors `fichiers_autorises`), à traiter dans une fiche dédiée.
- PR sensible : la fusion revient à Will seul.
