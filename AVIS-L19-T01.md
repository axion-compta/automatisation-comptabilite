VERDICT: A CORRIGER

PR #1162 « L19-T01 Noyau : pile « À vérifier » ». Relecture Opus du 12/11/2026 (consigne LOT5, section R), au SHA de tête b0dad693d4c8d0c4a52b0145e24819b157969df0.
Cet avis remplace, sur cette branche, l'avis précédent qui portait sur la PR de conception #1134.

## Vérifié
- Diff limité aux 4 fichiers_autorises ; 226 lignes ajoutées pour 240 permises.
- 9 tests verts (vitest, Node 22). CI de la tête verte.
- Aucune horloge système, ordre stable par identifiant, fuseau de la société en paramètre, minuit de changement d'heure testé.
- Journal : 9 lignes, commence par « # Journal L19-T01 ». Aucun mot interdit, aucun secret, aucun prix.
- Mutations tuées : retrait du contrôle de tvaEnJeu, `tete.length === 1` → `>= 1`, inversion du tri TVA, voisin précédent/suivant, instant NaN, seconde passe du fuseau.

## Défauts
1. packages/noyau/src/interface/pile-a-verifier.ts:49-52 et 91 : `masqueJusqu` n'est pas contrôlé. Avec `masqueJusqu: NaN`, `maintenant >= NaN` est faux : la carte est masquée pour toujours, en silence (vérifié : pile vide en 2030).
   Correction : `carte_invalide` si `masqueJusqu` est présent et n'est pas un nombre fini. Ajouter un test.
2. pile-a-verifier.test.ts, test `entrees-invalides-refusees` : Infinity n'est jamais testé sur une carte. Ces mutations survivent (9 tests verts) :
   - `!Number.isFinite(c.groupe)` → `Number.isNaN(c.groupe)` ;
   - `!Number.isFinite(c.tvaEnJeu)` → `Number.isNaN(c.tvaEnJeu)` ;
   - `!Number.isFinite(p.confiance)` → `Number.isNaN(p.confiance)`.
   Or deux groupes à Infinity donnent `Infinity - Infinity = NaN` dans `ordre`, et le tri n'est plus stable.
   Correction : un cas Infinity pour groupe, tvaEnJeu et confiance (`carte_invalide`).
3. pile-a-verifier.ts:50 : `tvaEnJeu` est en centimes, mais 0,5 est accepté. Le cas « non entier » de la consigne manque.
   Correction : `Number.isInteger(c.tvaEnJeu)`, avec un test.

## Remarques
- `!(maintenant < c.masqueJusqu)` survit, mais cette mutation est équivalente : ce n'est pas un défaut.
- Après correction, rester sous 240 lignes (226 aujourd'hui).

SHA de tête relu : b0dad693d4c8d0c4a52b0145e24819b157969df0
