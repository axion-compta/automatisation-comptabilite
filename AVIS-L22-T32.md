VERDICT: OK

PR n°1156, fiche L22-T32, seconde relecture au SHA de tête 243ed1ff7cc579ced5adb95908d06874ff12d7e7 (avis précédent : A CORRIGER au SHA 69971a0d055ecba732ee7ada91b5b55bd2bebc09).

## Défauts précédents : levés
1. `trouvees.some(` -> `trouvees.every(` (`sources.ts:46`) : rouge. Les mutations « première entrée seule » et « dernière entrée seule » sont rouges aussi, grâce aux deux ordres testés.
2. Ordre inversé : début 2027-01-01 et fin 2026-01-01, date 2026-06-15, rend `perimees: [CITATION]`. Une mutation qui remplace les deux contrôles de bornes par un « ou » est rouge.
3. La remarque facultative est reprise : `expect(reussis).toBe(noms.length)`.

## Pas de régression
- Depuis la relecture précédente, seul `regles-hierarchie.test.ts` a changé ; `sources.ts` n'a pas bougé.
- Vitest sur `regles-hierarchie.test.ts` et `sources.test.ts` : 16/16 au vert. Mutations relancées : `<` -> `<=` sur le début et sur la fin, retrait de `borneValide` sur le début. Toutes sont rouges.
- 4 fichiers, tous dans `fichiers_autorises` ; 131 lignes (plafond 200) ; journal de 8 lignes ; aucun secret, aucun prix, aucun mot interdit.

## Remarques (non bloquantes)
- Une mutation artificielle survit : ignorer le début quand l'intervalle est inversé. Elle n'est attrapée que pour une date antérieure aux deux bornes, par exemple 2025-06-15 avec le registre inversé. Un tel cas fermerait ce trou (facultatif).
- `injection-antidater-refusee` est détecté par le motif `ignore_consignes`, pas par l'antidatage. C'est du code existant, hors périmètre de la fiche.
- CI : `tests` et `verifier` sont rouges à cause de `outils/exploitation/__tests__/ouverture.test.mjs`. Ce test est rouge aussi sur `main` et la PR ne le touche pas. Ce n'est pas un défaut de l'auteur.
- Fiche sensible : la fusion revient à Will seul.
