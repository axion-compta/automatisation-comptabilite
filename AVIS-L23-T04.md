VERDICT: A CORRIGER

PR n°1174, fiche L23-T04, tête relue : c1398b12829c60153daaee77393fddeeed962d58

## Défaut
1. `packages/parametres/src/registre-sources.ts:63` : mutation survivante. Remplacer `!Number.isFinite(seuilJours)` par `Number.isNaN(seuilJours)` laisse les 6 tests verts : un seuil `Infinity` n'est pas testé. Le seuil infini serait alors accepté et aucune alerte ne sortirait jamais.
   Correction demandée : dans `consultation-90-jours-sans-alerte` (`packages/parametres/src/__tests__/registre-sources.test.ts`), ajouter `expect(() => alertesConsultation(reg, '2026-04-01', Infinity)).toThrow();` (et `-Infinity`).

## Vérifié
- Fichiers : 4, tous dans `fichiers_autorises` ; 221 lignes ajoutées sur 240 au plus.
- Les 6 tests nommés passent en local. Mutations tuées : `>` → `>=` (frontière des 90 jours), `seuilJours < 0` → `< -1` (seuil 0), date de consultation invalide → pas d'alerte, contrôle d'aller-retour de la date (2026-02-30).
- Couverture calculée depuis les catalogues IS et TVA ; `formes-perimetre` n'a aucun `source_url` (assertion explicite).
- Licence et quota à `a_confirmer`, aucune entrée `verifie`. Aucun secret, aucun prix, aucun mot interdit ; journal de 6 lignes.
- CI au SHA relu : 9 jobs verts.

## Remarque
- Fiche sensible : fusion par Will seul.
