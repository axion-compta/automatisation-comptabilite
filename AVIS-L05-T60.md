VERDICT: OK

# Avis L05-T60 (PR #1038, fiche SENSIBLE) : relecture après correction

SHA relu : 67766ca3386314449631f05434b74f77d0c941a7 (tête de `lot-05/L05-T60`).
Fiche de référence : `origin/main:pilotage/fiches/L05-T60.md` (#1032 est fusionnée).

## Défaut de l'avis précédent : corrigé
1. Durées NaN, infinies et négatives : `transcription.test.ts:34-39` les teste (rejet `SegmentTropLong`, port non appelé, octets remis à zéro). Vérifié par mutation : `!(dureeMs > 0)` changé en `dureeMs <= 0` (M3) et une durée `Infinity` acceptée (M7) font maintenant rougir `segment-trop-long-refuse`.

## Contrôles
- Périmètre : 6 fichiers, tous dans `fichiers_autorises` ; 242 lignes ajoutées sur 300 au plus ; aucune ligne « - - ». La fiche passe à `statut: fait`.
- Journal : 9 lignes, commence par `# Journal L05-T60`.
- vitest ciblé : 11/11 verts. eslint et tsc (serveur, web) verts. `node scripts/verifier.mjs --gardes` : vert (21 étapes). CI au SHA relu : les 9 tâches sont vertes, `verifier` et `gardes` compris.
- Mutations encore rouges : effacement des octets retiré (3 tests), `recapitulatifLu` ignoré (2 tests), appel `capturer()` sorti du `try` (nouveau test `capture-en-panne`).
- Remarques suivies : `estOuiSeul` réutilisé dans `Dictee.tsx`, panne de capture gérée et testée.
- D88 respectée ; aucun prix, aucun mot interdit, données fictives.

## Remarques (non bloquantes)
- `apps/web/src/chat/Dictee.tsx:4` importe encore du code de `apps/serveur/src` : à déplacer dans un paquet commun lors de la fiche de branchement.
