VERDICT: A CORRIGER

PR #1157, fiche L24-T34, tête relue : d974427cb3ede199e298ca96fa7a1f03b3f9ec01

## Défauts
1. packages/noyau/src/agents/pole-rgpd.ts:15 : mutant survivant. Remplacer `forme(l.finalite) === f` par `forme(l.finalite).startsWith(f)` laisse passer les 3 tests : une finalité tronquée (préfixe strict d'une finalité inscrite, par ex. ses premiers mots) serait acceptée sans être au registre. Correction demandée, dans pole-rgpd.test.ts (`traitement-hors-registre-refuse`) : un préfixe strict et une sous-chaîne d'une finalité du registre sont refusés et escaladés.
2. apps/serveur/src/ia/__tests__/banc-sensibles.test.ts:12-17 : le banc ne couvre que les mots-clés. Deux des quatre motifs qui rendent une pièce sensible dans `deciderSensibilite` ne sont jamais exercés : on peut retirer la MRZ (`contientMrz(texte) ||`) ou la règle NIR (`motifs.push('nir')`) dans `pieces/sensibles/identite.ts` sans que `banc-zero-donnee-sensible-envoyee` échoue (mutants survivants). Correction demandée : ajouter au banc des pièces fictives avec une ligne MRZ fictive à chiffre de contrôle juste et un NIR fictif à clé valide (construit comme dans `chiffres.test.ts`, `nir-cle-valide-masque`).
3. banc-sensibles.test.ts:12 : le banc est calculé à partir de `MOTIFS_SENSIBLES`, la liste même qu'utilise le détecteur. Si l'on retire un motif de `motifs.ts` (essayé avec `'payslip'`), le banc perd simplement 3 cas (39 -> 36) et reste vert. Correction demandée : au moins une partie du banc (10 pièces ou plus) écrite à la main, indépendamment de la liste, pour qu'un motif retiré fasse rougir le test.

## Contrôles passés
- Fichiers : les 5 du diff sont dans fichiers_autorises ; 111 lignes sur 280 au plus ; aucune ligne « - - » ; le lien node_modules ajouté par erreur a bien été retiré.
- Tests nommés : les 4 passent (vitest, packages/noyau et apps/serveur).
- Mutants tués : `f !== ''` retiré, `trim` retiré, `toLowerCase` retiré, `some` remplacé par `every`, finalité de l'escalade vidée, `texteTransmissible: masque` dans etape-preparation.
- Témoin non sensible présent (1 appel). Noms fictifs (Alice Fictive, Bruno Inventé). Aucun secret, prix ni mot interdit. Journal : 5 lignes.
- La catégorie `secrets` est exclue du banc à juste titre : elle donne un masquage, pas une pièce sensible.

## Remarques
- CI : à la relecture, tous les jobs de cette tête étaient encore en file d'attente.
- Le banc réécrit la barrière d'`etape-lecture.ts:43` (`texteTransmissible === null` -> pas d'appel) au lieu de l'appeler. Ce n'est pas bloquant, car l'assertion sur `prep` porte sur le code réel.
- Fiche `sensible: oui` : la fusion revient à Will.
