VERDICT: OK

PR #1157, fiche L24-T34 (sensible : fusion par Will seul), seconde relecture, tête relue : b13b5cbd01730119c0c4ddf73eae6b6e0c1e3ad1

## Défauts précédents (avis sur d974427c) : levés
1. Préfixe ou sous-chaîne d'une finalité : levé. `traitement-hors-registre-refuse` teste 4 formes partielles. Mutants tués : `forme(l.finalite).startsWith(f)`, `.includes(f)`, `f.startsWith(forme(l.finalite))`.
2. MRZ et NIR dans le banc : levé. Le banc contient une ligne MRZ fictive (spécimen L898902C3, chiffre de contrôle 6) et un NIR à clé calculée. Mutants tués : `contientMrz(texte) ||` retiré, `motifs.push('nir')` retiré (identite.ts:52 et 54).
3. Banc dépendant de MOTIFS_SENSIBLES : levé. 13 pièces sont écrites à la main, et leur nombre est vérifié (au moins 10). Mutants tués : retrait de 'payslip', 'ordonnance medicale', 'titre de sejour' ou 'medical certificate' dans motifs.ts.

## Contrôles passés
- Les 5 fichiers du diff sont dans fichiers_autorises ; 128 lignes sur 280 au plus ; aucune ligne « - - ».
- Les 4 tests nommés passent (pole-rgpd 3/3, banc-sensibles 1/1).
- Journal : 5 lignes, commence par « # Journal L24-T34 ». Noms fictifs. Aucun secret, prix ni mot interdit.
- Aucune régression : la correction ne touche que les deux fichiers de test.

## Remarques
- CI : les jobs `tests` et `verifier` sont rouges, mais pas à cause de cette PR. L'échec vient de `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues` (en-tête `porte` contre `porte_rgpd`), et ce test échoue aussi sur origin/main 347401ab. Il faut le réparer sur main avant la fusion.
- La fiche passe à `statut: fait` dans la PR.
