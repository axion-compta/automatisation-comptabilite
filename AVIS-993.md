VERDICT: A CORRIGER
SHA relu : acd81b358b737712a07f318804ec734f1c95ce62

# Avis de relecture PR 993 (L07-T44)

Fiche lue sur origin/main (de38efd). Relecture au SHA ci-dessus. La demande de relecture la classe parmi les fiches sensibles, même si la fiche porte `sensible: non` : fusion par Will.

## Contrôles passés
- Fichiers : 5, tous dans `fichiers_autorises`. Taille : 86 + 2 = 88 lignes, sous 200.
- `pnpm verifier` relancé : vert (24 étapes). Tests `outils/faux-hote-c4` : 36 verts. CI verte.
- Bloc facultatif (manifeste sans `commercial` accepté) ; `VERSION_CONTRAT` reste `0.5.0`.
- Modes d'arrivée `installation_axion` et `libre_service` ; opérations identiques au port L07-T42 (`creerEspace`, `inviter`, `suspendre`, `geler`, `supprimer`) ; événement de consommation (société, agent, coût en micro-centimes, date).
- `actif: false` gardé et vérifié.

## Défauts à corriger
1. Refus des clés de prix incomplet : `cleMontant` n'examine que les clés d'objet, pas les noms de champs déclarés. Essai relancé : `evenementsConsommation: [{ code: 'c', champs: ['prixUnitaire'] }]` est accepté par `validerManifeste` (aucune erreur), de même qu'un `code: 'tarif_ia'`. `champs` liste justement des noms de champs : appliquer `CLES_MONTANT` aussi aux chaînes de `champs`, `code`, `modesArrivee` et `operationsMiseEnService`, et ajouter un test par cas au test `commercial-aucun-montant`.
2. Le commentaire annonce « present = strict », mais les clés inconnues du bloc sont acceptées (essai : `remise: 5` est accepté). Refuser toute clé hors `modesArrivee`, `libreService`, `operationsMiseEnService`, `evenementsConsommation` (et hors `code`, `champs` dans un événement), avec un test ; ou corriger le commentaire et dire au journal pourquoi le bloc reste ouvert.
3. Mineur : dans `defineAutomation`, `commercial` est copié par JSON mais pas gelé, alors que tous les autres champs rendus sont gelés (`Object.freeze`). Le geler (en profondeur), avec un test.
