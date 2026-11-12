VERDICT: A CORRIGER

PR #1213 (L19-T02). Tête relue : c2ba0a36d7c72477404395a9729bb5871a95dd63
Relecteur Opus, consigne LOT5 section R. Seconde relecture, après l'avis A CORRIGER sur d6c81fde3ed88163dc07be50afbcf45aa4d2b9a9.

## Défauts de l'avis précédent : vérifiés par mutation
1. Gestionnaires de l'appelant : les retraits de `reste.onFocus`, `onBlur`, `onKeyDown`, `onMouseEnter` et `onMouseLeave` sont tués, de même que le `return` d'Échap placé avant `onKeyDown`. Corrigé.
2. Infobulle au survol : les retraits de `montrer(true)()` sur mouseenter et de `montrer(false)()` sur mouseleave sont tués. Corrigé.
3. Remarque du doublon `toBeFocused` dans l'e2e : supprimé.

## Vérifié
- Fichiers : les 5 fichiers du diff sont dans `fichiers_autorises`. 173 lignes ajoutées et 6 supprimées, soit 179 pour 180 permises. Aucun octet NUL.
- Les 7 tests de `bouton-raccourci.test.tsx` passent (vitest, jsdom). L'e2e n'a pas été relancé ici.
- Aucun secret, aucun prix, aucun mot interdit. Données fictives. Journal de 9 lignes.

## Défaut (mutations survivantes, nouvelles)
1. `packages/ui/src/composants/Bouton.tsx`, branche `raccourci`, lignes 29 et 30 : on peut retirer `disabled={desactive}`, ou `type={type}`, sans qu'aucun test de `packages/ui/src/composants` ne rougisse. Les deux mutants survivent.
   Conséquence : un `Bouton desactive` qui a un raccourci resterait cliquable, et sans `type`, un bouton placé dans un formulaire l'enverrait (type « submit » par défaut).
   Correction : dans `raccourci-dans-aria-keyshortcuts`, ajoute sur une seule ligne, par exemple `const d = await monter(<Bouton raccourci={raccourci} desactive>V</Bouton>); expect([bouton(d).disabled, bouton(d).type]).toEqual([true, "button"]);`. Le diff passe alors à 180 lignes sur 180 permises. Si la garde compte autrement, gagne une ligne ailleurs (par exemple en regroupant deux `expect`), sans retirer de test.

## Remarques
- Les remarques de l'avis précédent restent valables : l'e2e dépose deux fichiers au lieu d'un, et l'anomalie du faux serveur demande une fiche de suivi ; /documents/deposer est ouvert par `page.goto`.
