VERDICT: OK
69d073813807b66af852dbb69ce8a67ace7ee0ef

# Avis L24-T32 (PR n°1165), relecteur Opus

Fiche `sensible: oui` : fusion par Will seul.

- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 162 lignes ajoutées (max 250). `hierarchie.ts` non modifié.
- Tests nommés présents (5/5) ; 5 tests passent en local. CI verte.
- Fonction pure, aucun appel à un modèle. Rôle `comptable` pris dans `securite/types.ts` (aucun rôle « comptable invité » distinct n'existe).
- Cas limites présents : NaN, Infinity, non entier, 0, négatif, source vide ou blanche, `sources` absent, identifiant de rôle vide.
- Aucun mot interdit, aucun secret, aucun prix ; données fictives.
- Mutations tuées (10/11) : `!== true` → `=== false`, `isSafeInteger` → `isFinite`, contrôle de `balance.total` retiré, `sources.length === 0` retiré, `Array.isArray` retiré, `trim()` retiré, ordre comptable/administrateur inversé, contrôle d'identifiant vide retiré, tolérance d'un centime, `===` → `>=`.

## Remarques (non bloquantes)
- Mutant survivant : `refus(['ecart_balance', 'aucun_destinataire'])` → `refus(['aucun_destinataire'])` ; `pole-fiscal.test.ts:78` utilise `toContain`. Remplacer par `toEqual(['ecart_balance', 'aucun_destinataire'])`.
- La somme des lignes n'est pas comparée à `declaration.total` : une déclaration dont le total égale la balance mais dont les lignes ne s'additionnent pas est acceptée. La fiche ne l'exige pas ; à prévoir dans une fiche suivante.
- Une déclaration sans aucune ligne est acceptée si le total égale la balance (non testé).
