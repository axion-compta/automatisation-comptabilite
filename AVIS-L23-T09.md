VERDICT: OK
b0b05c78ca08bc7b0f6080f1dd9815a68fad98e6

Seconde relecture de la PR n°1195, fiche L23-T09, au SHA de tête b0b05c78ca08bc7b0f6080f1dd9815a68fad98e6. L'avis précédent (A CORRIGER, tête 68041c0) est levé. Fiche sensible : fusion par Will seul.

## Défauts précédents, vérifiés par mutation dans `packages/noyau/src/change/taux.ts`
1. Suppression de `&& jourInstant === m[1]!` : un test échoue (samedi 2027-05-15 consulté le 2027-05-15T10:00Z). Levé.
2. `regle.jourSansCotation !== 'veille_ouvree'` neutralisé : un test échoue. Levé.
3. `trouvees.length !== 1` changé en `< 1` : un test échoue (deux lignes actives). Filtre `l.cle === 'change.bce.regle'` supprimé : un test échoue (ligne d'une autre clé). Levé.
4. Suppression de `regle === null ||` : un test échoue (`valeur: 'null'`). Levé.

Autres mutations, toutes tuées : filtre `statut !== 'retire'` supprimé ; `date < l.effet_fin` changé en `<=`.

## Contrôles
- Diff : 6 fichiers, tous dans `fichiers_autorises` ; 260 lignes sur 260.
- `taux.ts` est inchangé depuis la première relecture. `taux.test.ts` n'est pas modifié et passe. Depuis la première relecture, le test n'a perdu que trois commentaires ; aucune assertion n'a été retirée.
- Tests : 44 sur 44 dans `src/change` ; `change-bce.test.ts` passe. Journal : 7 lignes.
- Aucun mot interdit, aucun secret, aucun prix.

## Remarques (ne bloquent pas)
- CI : `tests` et `verifier` sont rouges pour la seule cause `ouverture.test.mjs > onze-cases-attendues`. Ce test échoue aussi sur `origin/main`. Ce n'est pas un défaut de cette PR.
- `source_url` est provisoire ; l'heure 15:00 UTC reste à trancher à la vérification du paramètre.
