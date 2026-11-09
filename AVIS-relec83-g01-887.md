VERDICT: OK
SHA relu : bfdd68fc110d279aae7f21347c6d71b6874e4174
PR 887 — fiche L00-T64 (sensible, garde), branche lot-00/L00-T64, base main 00c1de9768428585aec47aedc4b854098d089a85

## Vérifications
- Fichiers modifiés : `outils/gardes/fiches-exceptions.json`, `outils/gardes/test/fiches.test.mjs`, `pilotage/fiches/L00-T64.md`, `pilotage/journal/L00-T64.md` : tous dans `fichiers_autorises`.
- Taille : 32 lignes ajoutées + 3 retirées = 35 ≤ 80 ; aucune ligne « - - ».
- Entrée ajoutée en fin de tableau, sur une ligne : `id` = `["L11-T27","L11-T38","L11-T39"]`, `regle` = `partage`, `motif` identique mot pour mot au texte de la fiche (point 1), sans guillemet double interne. L11-T44 n'est pas dans `id`.
- Entrées existantes : contenu inchangé ; la seule modification est la virgule finale de la dernière entrée, exigée par la syntaxe JSON.
- `outils/gardes/fiches.mjs` : aucune ligne modifiée ; aucune autre garde touchée, rien d'assoupli.
- Portée de l'entrée : dans `analyserFiches`, l'erreur `partage` est portée par la première fiche de la paire (ordre des noms) et l'exception ne masque que les erreurs portées par un id listé. L'entrée ne masque donc que les paires (L11-T27|T38|T39, Y) ; le test borné exige Y = L11-T44 pour chacune.
- Imports : `analyserFiches, charger, lireExceptions` depuis `../fiches.mjs` sans alias ; `test` de `node:test` sans alias.
- Journal : 5 lignes, commence par `# Journal L00-T64`. Statut de la fiche passé à `fait`.
- Aucun mot interdit, aucun prix, données fictives (fiche fictive L11-T98 dans un dossier temporaire).

## Rejeu
1. Sans l'entrée : `exception-partage-l11-t44-motivee` rouge (10 passent, 1 échoue) ; garde fiches verte sur main (L11-T44 absente).
2. Entrée élargie (`L11-T40` ajouté à `id`) : rouge, via `exception-partage-l11-t44-motivee` (égalité exacte de l'id).
3. Paire réelle sans L11-T44 (copie de L11-T27 en L11-T97 sans dépendance, partageant `app.ts`) : `exception-partage-l11-t44-bornee` rouge ; la garde montre que la paire L11-T27/L11-T97 était masquée par l'entrée, ce que le test borné attrape.
4. `node --test outils/gardes/test/fiches.test.mjs` : 11/11 sur la branche et sur main + PR (fusion locale).
5. `node outils/gardes/fiches.mjs` : vert sur main + PR (890 fiches cohérentes).
6. `pnpm verifier` sur main + PR : tests (684 fichiers), tests des gardes et toutes les gardes verts ; l'étape « types » échoue seulement sur le contrôle de version de Node du cloud (22 au lieu de 24) ; relancée à part (`pnpm -r exec tsc --noEmit`, contrôle de version désactivé) : verte.

## Remarques (non bloquantes)
- `outils/gardes/test/fiches.test.mjs` : le test borné utilise la liste fixe `PORTEUSES` et ne lit pas l'`id` de l'entrée. Un élargissement de l'entrée fait donc rougir `exception-partage-l11-t44-motivee` (égalité exacte), pas le test borné. Ce point reste couvert tant que l'entrée existe, et L00-T65 retire l'entrée en même temps que le test motivé : aucune faiblesse non bornée. Cela tient le critère de la fiche (le test borné rougit si l'entrée masque une paire sans L11-T44).
