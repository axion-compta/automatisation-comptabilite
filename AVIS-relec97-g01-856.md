VERDICT: OK
SHA relu : 3687928cdc1fcc0d8dc68642d6cd04a07d38e9db

# Avis de relecture stricte après correction : L03-T57 (PR #856, fiche sensible)

Ancien avis A CORRIGER relu : `origin/reprise/avis-856:AVIS-ancien-856.md` (SHA 7aca5b8, deux défauts bloquants).

## Défauts de l'ancien avis
1. Fraîcheur ouverte par défaut si `toleranceMs` ou `maintenantMs` vaut NaN : CORRIGÉ. `reception.ts:37-38` refuse (`webhook_perime`) si `maintenantMs` n'est pas fini, si `toleranceMs` n'est pas un entier sûr positif ou nul, ou si `horodatageMs` n'est pas fini. Le test `webhook-perime-refuse` couvre NaN, Infinity et -1 (horodatage 0, maintenant 1e13), et la borne exacte acceptée.
   Mutations rejouées : vérification de `maintenantMs` retirée : rouge ; vérification de `toleranceMs` retirée : rouge ; vérification de `horodatageMs` retirée : rouge.
2. Arrivée mal formée qui bloquait la plateforme sans alerte : CORRIGÉ. `reception.ts:59-65` isole l'arrivée fautive (seule `ErreurFactureRecue` est rattrapée, toute autre erreur remonte vers `plateforme_en_echec`) ; elle n'est ni rangée ni accusée, une alerte `arrivee_invalide` est émise (l. 72), le reste de la page est rangé et le curseur avance. Le contrôle `reception_en_retard` est sorti du `try` (l. 112-113). Nouveau test `arrivee-mal-formee-alerte-sans-bloquer-la-page` (date `2026-02-30`).
   Mutations rejouées : relancer l'erreur (comportement ancien) : rouge ; supprimer l'alerte `arrivee_invalide` : rouge.

## Autres contrôles
- Fusion de main : `git diff origin/main...HEAD` ne touche que les 4 fichiers de la fiche, rien de main n'est perdu ; main a avancé de 2 commits depuis (#897, #890) et la fusion reste propre (`git merge-tree` sans conflit).
- Périmètre : 4 fichiers, tous dans `fichiers_autorises`. Taille : 285 lignes (148 + 128 + 2 + 8, aucune ligne « - - ») pour 300 au plus.
- Tests : 11/11 (les 10 nommés + le test ajouté). Critère 2 : comparaison de signature remplacée par `true` : `webhook-signature-fausse-refuse` rouge. Autres mutations : `autre_destinataire` accusé : rouge (pa2) ; contrôle de retard supprimé : rouge.
- `pnpm verifier` (Node 22, `engine_strict=false`) : vert, 24 étapes (types, lint, 690 fichiers de tests, toutes les gardes).
- Aucun mot interdit, aucun prix, aucun secret en dur (secret assemblé à l'exécution), SIREN fictifs de la fiche, `plateforme-fictive`, aucun nom réel, aucun octet NUL, aucun import de `ia`. Journal : 8 lignes, commence par `# Journal L03-T57`. Fiche : seul `statut: fait` change.

## Remarques (non bloquantes)
- `reception.ts:113` : si `delaiAlerteMs` vaut NaN, `reception_en_retard` ne se déclenche jamais (même schéma que l'ancien défaut 1, côté alerte). Fiche de suite conseillée : refuser un `delaiAlerteMs`/`delaiAppelMs` non entier sûr positif.
- Aucun test ne vérifie que `reception_en_retard` est encore émis après un `plateforme_en_echec` (mutation « retour anticipé dans le `catch` » : vert). Le code est juste et l'échec est déjà alerté, donc pas de bascule silencieuse ; un cas de test serait utile.
- Mutation « tolérance négative admise » : vert, car le cas -1 est aussi périmé par l'écart. Le refus reste fermé, sans risque.
- Une arrivée `arrivee_invalide` est dépassée par le curseur : seule l'alerte en garde la trace (choix accepté par l'ancien avis).
