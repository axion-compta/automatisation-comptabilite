VERDICT: OK

PR n°1147, fiche L24-T25 (sensible : fusion par Will seul). Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R), au SHA de tête f2c82915de5206ac0158b9dd5c683e13aeb55658.
Avis précédent : A CORRIGER au SHA 3c8c9e9b06025c126814cec01ff00f2e930c958c.

## Défaut précédent : levé
1. Les cas non entier et Infinity sont maintenant testés : `ecart-releve.test.ts:52-54` couvre `1.5 / 0.5`, `Infinity` et `-Infinity`. J'ai refait la mutation `soustraire(centimes(soldeReleve), centimes(solde512))` → `soustraire(soldeReleve, solde512)` : elle est TUÉE (1 test rouge sur 5).

## Aucune régression
- Le diff contre main ne contient que les 4 fichiers de la fiche, pour 105 lignes (maximum 180). La fusion de main n'a laissé aucun fichier étranger dans le diff.
- Le correctif ne touche que le fichier de test, et le code est inchangé depuis la première relecture.
- Tests ciblés : 5 sur 5 verts en local (Node 22).
- Journal : 6 lignes, il commence par `# Journal L24-T25`. Aucun mot interdit, aucun secret, aucun prix. Données fictives seulement.

## Remarques (non bloquantes)
- Retirer un seul des deux `centimes()` donne un mutant équivalent. `soustraire` refuse déjà un résultat non entier ou infini, donc seul un couple d'entiers non sûrs (au-delà de 2^53) ferait une différence. Ce n'est pas bloquant.

## CI de la tête (hors périmètre de la PR)
- Les jobs `tests` et `verifier` sont rouges, et tous les autres jobs sont verts.
- Cause : un seul test échoue, `outils/exploitation/__tests__/ouverture.test.mjs` (`onze-cases-attendues`). L'en-tête attendu contient `porte` et l'en-tête lu `porte_rgpd`.
- Ce test échoue aussi sur `origin/main` (347401abb6fcba29b100aa6ba04d8ded5387684a), vérifié en local. Il vient du croisement des PR fusionnées n°1215 (L22-T30) et n°1146 (L25-T01).
- Ce n'est pas un défaut de l'auteur. Le critère `pnpm verifier` ne passera qu'après la réparation de main et une mise à niveau de la branche. Il faut une CI verte avant la fusion.

SHA de tête relu : f2c82915de5206ac0158b9dd5c683e13aeb55658
