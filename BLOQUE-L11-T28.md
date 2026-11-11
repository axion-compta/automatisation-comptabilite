# BLOQUE-L11-T28

Fiche L11-T28 non poussée en lot-11/L11-T28 : un test hors fichiers_autorises devient rouge.

- Test en cause : `packages/faux-serveur/src/__tests__/registres.test.ts`, cas `ordre-garde-puis-modules-puis-socle` (hors périmètre de la fiche).
- Cause : ce cas suppose les quinze registres de lot vides (« vides sinon »). Il attend son marqueur à l'index `tailleGarde`, juste après la garde. Dès que `registres/lot-11.ts` renvoie un handler, celui-ci passe avant le marqueur (`[...modules, ...marqueurs]`) et l'assertion `toBe(marqueur)` échoue.
- Le même cas échouera pour tout lot qui remplit son registre, pas seulement le lot 11.
- Mesuré : handlers, registre et suite commune écrits (environ 150 lignes, sous 280). Le reste de la suite passe, sauf deux cas de données (scénario et barème) encore à régler. Le blocage vient du seul test d'ordre.
- À changer : autoriser `registres.test.ts` dans la fiche, pour que le cas d'ordre cherche le marqueur après les handlers réels (par exemple `modules.length` de plus), ou prévoir une fiche de lot 00 qui l'assouplit. Décision de Will.
