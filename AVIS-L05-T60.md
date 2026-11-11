VERDICT: A CORRIGER

# Avis L05-T60 (PR #1038, fiche SENSIBLE)

SHA relu : 72e2756e5c75198250d72852f2d94075532cc434 (tête de `lot-05/L05-T60`).
Fiche de référence : `origin/lot-00/L00-T83:pilotage/fiches/L05-T60.md` (amendée par #1032, non fusionnée). Décision D88 appliquée.

## Contrôles
- Périmètre : 5 fichiers, tous dans `fichiers_autorises` ; 226 lignes ajoutées sur 300 au plus ; aucune ligne « - - ».
- Journal : 9 lignes, commence par `# Journal L05-T60`.
- Tests nommés présents : `audio-jamais-ecrit`, `transcription-editable`, `oui-avant-recapitulatif-ignore`, `segment-trop-long-refuse`, `normalisation-appliquee`.
- vitest ciblé : 10/10 verts. eslint et tsc (web, serveur) verts. Gardes locales vertes : fictif, textes, appels, litteraux, perimetre (avec la fiche amendée), tests, controles, registre-legal, sous-traitants, couleurs. CI au SHA relu : tout est vert.
- D88 : aucun appel à un fournisseur d'IA, aucun accès disque ni journal dans `transcription.ts` ; l'audio est remis à zéro dans `finally`, en cas de succès comme d'échec.
- Aucun prix, aucun mot interdit, données fictives.

## Mutations (7)
- M1 retrait de `segment.octets.fill(0)` dans `finally` : rouge (3 tests).
- M2 `accepterOui` ignore `recapitulatifLu` : rouge (2 tests).
- M4 borne `>` changée en `>=` : rouge.
- M5 `normaliser` non appliqué au retour du port : rouge.
- M6 garde du « oui » retirée de `Dictee.tsx` : rouge.
- M3 `!(segment.dureeMs > 0)` remplacé par `segment.dureeMs <= 0` (une durée NaN passe) : VERT, la mutation survit.
- M7 une durée `Infinity` est acceptée : VERT, la mutation survit.

## Défauts
1. `apps/serveur/src/voix/__tests__/transcription.test.ts:33` : les cas limites NaN et Infinity de la durée ne sont pas testés. La consigne les exige, et deux mutations de la garde de `apps/serveur/src/voix/transcription.ts:26` survivent : un segment de durée NaN ou infinie pourrait alors partir vers le port. Correction : dans `segment-trop-long-refuse`, ajouter `segment(Number.NaN)`, `segment(Number.POSITIVE_INFINITY)` et une durée négative, puis vérifier pour chacune `rejects.toBeInstanceOf(SegmentTropLong)`, `faux.appels()` inchangé et des octets remis à zéro.

## Remarques (non bloquantes)
- `apps/web/src/chat/Dictee.tsx:4` : c'est le seul fichier de `apps/web` qui importe du code de `apps/serveur/src`. Le module n'a aucune dépendance Node, mais il vaudrait mieux déplacer `normaliser`, `accepterOui` et le type `SegmentAudio` dans un paquet commun lors de la fiche de branchement.
- `apps/web/src/chat/Dictee.tsx:36` : l'expression `/^oui[\s.!]*$/i` copie `estOuiSeul`. Mieux vaut importer `estOuiSeul`.
- `apps/web/src/chat/Dictee.tsx:24` : si `capturer()` échoue, l'erreur n'est pas attrapée et aucun message n'est affiché. Placer l'appel dans le `try`.
- `apps/serveur/src/voix/transcription.ts:4` : la durée maximale d'un segment (15 s) est un paramètre technique. À rapprocher de la spec 05 §4 si elle fixe une valeur.
- La garde `perimetre` sur main reste rouge jusqu'à la fusion de #1032. Ce n'est pas compté comme défaut.
