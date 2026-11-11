# BLOQUE-L09-T37

Cause : « état en mémoire PARTAGÉ avec les lectures de L09-T36 » est impossible dans les fichiers_autorises.
- `packages/faux-serveur/src/domaines/profil.ts` (T36) crée son propre `creerServiceProfil` dans `creerHandlersProfil` : une écriture n'y est jamais visible. Ce fichier n'est pas autorisé par la fiche.
- Essai de contournement : reprendre `GET /profil` dans `profil-ecriture.ts` via `registres/lot-09.ts`. Rejeté par `packages/faux-serveur/src/__tests__/registres.test.ts` (tests `aucun-handler-de-module-ne-masque-le-socle-reel` et `ordre-garde-puis-modules-puis-socle`), fichier non autorisé et garde à ne pas assouplir.
- Mesuré : code + suite (~290 lignes) prêts, 7 tests verts contre le serveur en mémoire ; côté faux serveur, `ajout-puis-lecture` et `confirmation-puis-etat` ne peuvent passer sans partage.
À changer : ajouter `packages/faux-serveur/src/domaines/profil.ts` (et `handlers.ts`) aux fichiers_autorises, pour que `creerHandlersProfil` accepte le service `creerServiceProfilChamps` partagé fourni par `creerHandlersProfilEcriture`.
