VERDICT: OK
673b636b731fc36a662fe24d3bc41f815762c1ce

PR #1073, fiche L10-T47, SHA de tête relu : 673b636b731fc36a662fe24d3bc41f815762c1ce
Relecture de contrôle : l'avis OK portait sur a9eaeae7 ; la tête a changé par une fusion de main.

## Ce qui a changé depuis a9eaeae7
- Un seul commit propre : « Fusion de main dans lot-10/L10-T47 » (673b636b), qui apporte main (dont #1063 L10-T36 fusionnée en squash).
- `git diff a9eaeae7 673b636b` sur les fichiers de la fiche (`apps/web/src/ecrans/e24-ventes/`, `packages/textes/src/ecrans/e24-ventes.ts`, fiche, journal) : **vide**. Le fond est inchangé.
- Les fichiers de L10-T36 sont sortis du diff : `git diff origin/main...HEAD` ne contient plus que les 7 fichiers de la fiche (211 lignes ajoutées, 1 retirée).

## Vérifications au SHA de tête (Node 22)
- vitest `apps/web/src/ecrans/e24-ventes` : 14/14. `garde:perimetre` vert en local (L10-T47, 7 fichiers, 212 lignes ≤ 250). Fusion avec main sans conflit.
- Les mutations de l'avis précédent portaient sur ces mêmes fichiers, inchangés.
- Aucun mot interdit, aucun prix, aucune valeur légale en dur ; données fictives.

## CI au SHA de tête
Tous les jobs sont verts, dont `gardes` et `verifier`.

## Remarques (non bloquantes, reprises de l'avis précédent)
1. Les paramètres `mois` et `etat` des liens ne sont pas lus par `Ecran.tsx` : défaut de fiche, fiche de suite à prévoir.
2. Mois par défaut calculé en UTC.
3. Pas de test « indicateurs en erreur, liste affichée ».
4. Provisoire forcé côté client : une mutation qui ne garde que `d.provisoire` reste verte.
