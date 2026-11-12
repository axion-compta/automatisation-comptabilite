VERDICT: A CORRIGER

PR #1191, fiche L20-T29 (sensible : fusion par Will seul), relue au SHA de tête 3415d4401f20373bae593b08c687045be90052d1.

## Vérifié
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 192 lignes, pour une limite de 200.
- Tests ciblés : 5 tests sur 5 réussis. `controles-structure.ts` n'est pas modifié et le contrôle FEC-S07 de l'export est testé.
- Aucun mot interdit, aucun secret, aucun prix, données fictives. Le journal fait 8 lignes.
- CI : tous les jobs sont verts, sauf `verifier` encore en file.
- Mutation qui fait échouer un test : retrait du contrôle `colonnesIdentiques`.

## Défauts (mutations qui survivent : les 5 tests restent verts)
1. `packages/noyau/src/fec/lecture-tiers.ts:23` (`estControle`), borne C0. Remplacer `code < 32` par `code < 2` ne fait échouer aucun test : seuls les octets 0x00 et 0x01 sont testés. Ajouter un cas de refus avec 0x1F (et 0x0B ou 0x0C), et un cas accepté avec 0x20.
2. Même ligne, borne DEL. Remplacer `code >= 127` par `code >= 128` ne fait échouer aucun test : 0x7F n'est pas testé. Ajouter un refus avec 0x7F et un cas accepté avec 0x7E (`~`).
3. Même ligne, borne haute C1. Remplacer `code <= 159` par `code <= 158` ne fait échouer aucun test : seul 0x80 est testé. Ajouter un refus avec 0x9F et un cas Latin-9 accepté avec 0xA0.
4. `lecture-tiers.ts:29` (table `LATIN9`) : seul 0xA4 (€) est testé. Retirer `0xbd: 'œ'` (ou toute autre entrée sauf €) ne fait échouer aucun test. Le test `latin9-accepte` doit décoder les 8 octets propres au Latin-9 (Š š Ž ž Œ œ Ÿ €).
5. `lecture-tiers.ts:47-48` (`detecterSeparateur`) : le cas où la tabulation et la barre verticale donnent toutes deux le bon nombre de colonnes n'est pas testé. Remplacer `compatibles.length === 1` par `>= 1`, ou remplacer la ligne `find` par `return undefined`, ne fait échouer aucun test. Ajouter un en-tête ambigu : avec la bonne lecture, le séparateur attendu doit être retenu ; sinon, refus `format_fec_inconnu`.

## Remarques (ne bloquent pas)
- Une double marque d'ordre est refusée par le contrôle des en-têtes (U+FEFF n'est pas classé comme contrôle), pas par une règle à part. Le comportement attendu est obtenu, mais le commentaire de la ligne 55 le présente comme un cas de `estControle`.
- Le journal dit déjà « bornes des contrôles » vérifiées à la main, ce que les mutations 1 à 3 démentent.
