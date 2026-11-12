VERDICT: OK

PR #1183, fiche L22-T23. Troisième relecture Opus du 12/11/2026 (consigne LOT5, section R). Avis précédent : A CORRIGER sur 0bab11d716f8f466943bbd3ffe6d88f01f803fb7.
SHA de tête relu : 833f7d1090016b4a8dbf19227d990b97a7835554

## Défauts précédents
1. Validation au centime dans `compare` : levé, sans régression (la retirer fait rougir `valeurs-non-entieres-des-deux-cotes-en-ecart`).
2. Importeur du banc réel : levé. `importeur`, construit sur `numeroterOccurrences` et `lignesNouvelles` de `packages/noyau/src/banque/doublons.ts`, est défini au niveau du module (`banc-reel.test.mjs:27-32`). Le test réel appelle `lancerBancReel(process.env, { importeur })` (l. 41). Les mutations de l'importeur (lignes connues non mémorisées, `numeroterOccurrences` retiré) font rougir `reimport-reel-sur-doublons-noyau`.

## Vérifié
- 6 fichiers, tous dans `fichiers_autorises` ; 300 lignes pour un maximum de 300 ; aucune ligne « - - » ; aucune dépendance ajoutée.
- Les 7 tests nommés sont présents. Le test du banc réel est ignoré hors de la machine du banc, avec un titre qui cite L22-T23. 17 tests réussis et 1 ignoré.
- Journal de 6 lignes, commence par « # Journal L22-T23 ». Aucun secret, prix, nom réel ni mot interdit. Gardes locales vertes.
- 13 mutations sur 15 sont tuées : tolérance d'un centime, `isSafeInteger` remplacé par `isFinite`, `lignesCreees <= 0`, importeur ignoré, réimport toujours `ok`, K01 au TTC, K02 rapproché, etc.

## Remarques (non bloquantes)
- `banc-reel.mjs:79` : le mutant `?? NaN` remplacé par `?? 0` survit toujours (déjà connu).
- `banc-reel.mjs:71` : le mutant `m < 0` remplacé par `m <= 0` survit, mais il est équivalent (un montant nul ne change pas la somme).
- Le dédoublonnage `unique` par `id` reste à confirmer avec le format du vrai banc.
- La taille est exactement au plafond : tout ajout le dépassera.
- CI : `tests` et `verifier` sont rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs`, rouge aussi sur main. Ce n'est pas un défaut de l'auteur.
