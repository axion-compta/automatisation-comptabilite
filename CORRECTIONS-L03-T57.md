VERDICT: A CORRIGER
SHA relu : 7aca5b81daafdd3a7a5882ade84c1c857bc3311b

# Avis de relecture renforcée : L03-T57 (PR #856, fiche sensible)

## Contrôles effectués
- Périmètre : 4 fichiers, tous dans `fichiers_autorises`. Taille : 298 lignes pour 300 au plus (aucune ligne « - - »).
- Critère 1 : les 10 tests nommés passent (vitest, 10/10).
- Critère 2 : en remplaçant la comparaison de signature par `const bon = true;`, `webhook-signature-fausse-refuse` devient rouge. Vérifié.
- Critère 3 : aucun nom de plateforme réelle ni identifiant réel ; nom fictif `plateforme-fictive` ; SIREN fictifs de la fiche (123456782, 987654324) ; secret assemblé à l'exécution.
- Critère 4 : `pnpm verifier` est vert (tests 664 fichiers, gardes vertes, lint vert). L'étape « types » a échoué seulement à cause du Node 22 du cloud ; `tsc --noEmit` lancé directement sur tous les paquets est vert.
- Mutations : (1) comparaison de signature retirée : rouge ; (2) `autre_destinataire` accusé : rouge (pa2) ; (3) tolérance multipliée : rouge (webhook-perime-refuse).
- Aucun mot interdit, aucun prix, aucun secret, aucun IBAN, aucun octet NUL, aucun import de `ia`. Journal : 6 lignes, commence par `# Journal L03-T57`.
- Sécurité du webhook : HMAC-SHA256 sur horodatage + corps, `timingSafeEqual` protégé par le contrôle de longueur, secret absent ou vide refusé : correct.

## Défauts bloquants
1. `apps/serveur/src/factures-recues/reception.ts:42` : contrôle de fraîcheur ouvert par défaut si `toleranceMs` ou `maintenantMs` vaut NaN. `Math.abs(x) > NaN` est toujours faux : un webhook correctement signé mais daté de 1970 est accepté (vérifié par une sonde : `toleranceMs: NaN`, horodatage 0, `maintenantMs` 1e13 rend `{ ok: true }`). Un rejeu de webhook ancien redevient possible si la configuration est mal lue. Correction demandée : refuser (`webhook_perime`, ou une `ErreurReception('entree_invalide')`) si `maintenantMs` n'est pas un nombre fini, ou si `toleranceMs` n'est pas un entier sûr positif ou nul ; ajouter ces cas (NaN, Infinity, négatif) au test `webhook-perime-refuse`.
2. `apps/serveur/src/factures-recues/reception.ts:111` : une arrivée mal formée (date impossible, numéro vide, montant invalide) fait lever `ErreurFactureRecue` hors de `rattraper` : aucune alerte `plateforme_en_echec`, le contrôle `reception_en_retard` (l. 115-118) est sauté, et le curseur reste bloqué. Chaque relance relève la même erreur sur la même page : la réception de la plateforme s'arrête pour toujours sans alerte, et les arrivées valides de la page ne sont pas rangées non plus. Vérifié par une sonde (date `2026-02-30` : levée `ErreurFactureRecue/date_invalide`, alertes `[]`). Cela contredit « jamais de bascule silencieuse » de la fiche. Correction demandée : au minimum, alerter avant de relancer (ou ne pas relancer et alerter `plateforme_en_echec`), garder le contrôle de retard ; idéalement, isoler l'arrivée fautive (alerte dédiée, non accusée) pour ne pas bloquer le reste de la page. Ajouter un test.

##
