VERDICT: OK

PR n°1148, fiche L19-T19 (sensible : fusion par Will seul). Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R), au SHA de tête 9ba56663c8bb716710f8eaeedc151198c514d668.
Avis précédent : A CORRIGER au SHA bfb238f4497ce2aeabc91f5888a909e05626fe81.

## Défauts précédents : tous levés
J'ai refait les trois mutations à la main.
1. Retirer `-?` de `SEUIL_EN_DUR` (`outils/gardes/performance.mjs:11`) : TUÉ, grâce au nouveau cas `const seuil = -5;`.
2. Retirer `&& l.metrique === 'p95'` (`performance.mjs:39`) : TUÉ, grâce au nouveau tableau `banc-volume,p50` seul (attente « banc-volume/p95 absent »).
3. Retirer `&& l.metrique === metrique` (`outils/banc/volume.mjs:12`) : TUÉ, grâce aux nouveaux cas `lireSeuil` p50 + p95 (123) et p50 seul (erreur).
- La remarque sur la limite de la garde (`P95_MAX_MS = 800`) est maintenant documentée en commentaire, à la ligne 10.

## Aucune régression
- Le diff contre main ne contient que les 7 fichiers de la fiche, pour 184 + 5 lignes (maximum 220). Aucun test n'est retiré : les cas sont seulement ajoutés.
- `node --test outils/gardes/test/performance.test.mjs` : 7 sur 7 verts. `vitest run outils/banc` : 14 verts. `node scripts/verifier.mjs --gardes` : tout est vert (25 étapes).
- Journal : 6 lignes, il commence par `# Journal L19-T19`. Aucun mot interdit, aucun secret, aucun prix.

## CI de la tête (hors périmètre de la PR)
- Les jobs `tests` et `verifier` sont rouges, et tous les autres jobs sont verts.
- Cause : un seul test échoue, `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`). L'en-tête attendu contient `porte` et l'en-tête lu `porte_rgpd`.
- Ce test échoue aussi sur `origin/main` (347401abb6fcba29b100aa6ba04d8ded5387684a), vérifié en local. Il vient du croisement des PR fusionnées n°1215 (L22-T30) et n°1146 (L25-T01).
- Ce n'est pas un défaut de l'auteur. Il faut une CI verte, après la réparation de main et une mise à niveau, avant la fusion.

SHA de tête relu : 9ba56663c8bb716710f8eaeedc151198c514d668
