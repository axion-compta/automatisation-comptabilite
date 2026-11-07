import { createBrowserHistory, createRootRoute, createRoute, createRouter, Outlet, type RouterHistory } from '@tanstack/react-router';
import { Ecran } from '../Ecran.js';
import { Accueil } from './Accueil.js';
import { PageEnPreparation } from './PageEnPreparation.js';
import { verifierEcrans, type DefinitionEcran } from './ecrans.js';

/** Construit le routeur : accueil, écran d'essai, une route par écran, page introuvable = page en préparation. */
export function creerRouteur(ecrans: readonly DefinitionEcran[], historique?: RouterHistory) {
  // Les chemins « / » et « /essai » sont réservés : un écran ne peut pas les reprendre.
  const reserves: DefinitionEcran[] = [
    { id: 'accueil', chemin: '/', composant: Ecran, groupe: 'autre', titre: '' },
    { id: 'essai', chemin: '/essai', composant: Ecran, groupe: 'autre', titre: '' },
  ];
  verifierEcrans([...reserves, ...ecrans]);
  const racine = createRootRoute({ component: Outlet, notFoundComponent: PageEnPreparation });
  const routes = [
    createRoute({ getParentRoute: () => racine, path: '/', component: () => <Accueil ecrans={ecrans} /> }),
    createRoute({ getParentRoute: () => racine, path: '/essai', component: Ecran }),
    ...ecrans.map((e) => createRoute({ getParentRoute: () => racine, path: e.chemin, component: () => <e.composant /> })),
  ];
  return createRouter({ routeTree: racine.addChildren(routes), history: historique ?? createBrowserHistory() });
}
