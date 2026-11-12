VERDICT: OK

PR n°1150, fiche L20-T01 (sensible : fusion par Will seul). Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R), au SHA de tête d6a0d108b29ca36b814cbf6b9fd902d71546d5d8.
Avis précédent : A CORRIGER au SHA 3513d3d897855be3443bf6465d34bedfa00d1943.

## Défauts précédents : levés
J'ai refait les deux mutations à la main.
1. `Number.isSafeInteger(n)` → `Number.isFinite(n)` (`organe.ts:62`) : TUÉ. Le test « entrées invalides » couvre NaN, 1.5, Infinity, -Infinity et -1.
2. `g.source.trim() === ''` → `g.source === ''` (`organe.ts:66`) : TUÉ. `regle_non_sourcee` couvre `''` et `'   '`.
- La remarque sur la SARL ou la SAS à associé unique (`regle_absente`) est maintenant couverte par un test explicite.

## Aucune régression
- Le diff contre main ne contient que les 7 fichiers de la fiche, pour 279 + 1 lignes, soit exactement la limite `taille_max_lignes` (280).
- Les 9 tests nommés sont présents. Tests ciblés : noyau 19 sur 19 et parametres 1 sur 1, verts en local.
- Les commits « compacte les tests » ont seulement réuni des assertions en boucles : aucune assertion n'a disparu.
- Journal : 6 lignes, il commence par `# Journal L20-T01`. Aucun mot interdit, aucun secret, aucun prix.

## Remarques (non bloquantes)
- La PR est à la limite de taille : tout ajout futur demandera une fiche ou une réduction.
- La date `DEBUT = '2022-12-31'` du catalogue est toujours marquée « à vérifier » : Will doit la confirmer.

## CI de la tête (hors périmètre de la PR)
- Les jobs `tests` et `verifier` sont rouges, et tous les autres jobs sont verts.
- Cause : un seul test échoue, `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`). L'en-tête attendu contient `porte` et l'en-tête lu `porte_rgpd`.
- Ce test échoue aussi sur `origin/main` (347401abb6fcba29b100aa6ba04d8ded5387684a), vérifié en local. Il vient du croisement des PR fusionnées n°1215 (L22-T30) et n°1146 (L25-T01).
- Ce n'est pas un défaut de l'auteur. Le critère `pnpm verifier` ne passera qu'après la réparation de main et une mise à niveau. Il faut une CI verte avant la fusion.

SHA de tête relu : d6a0d108b29ca36b814cbf6b9fd902d71546d5d8
