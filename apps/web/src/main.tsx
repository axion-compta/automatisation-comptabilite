// Les jetons passent en premier : les feuilles suivantes lisent leurs variables.
import '../../../packages/ui/src/jetons.css';
import '../../../packages/ui/src/composants/composants.css';
import '../../../packages/ui/src/composants/tableau.css';
import { RouterProvider } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import { ecransDecouverts } from './socle/ecrans.js';
import { creerRouteur } from './socle/routeur.js';

async function demarrer() {
  // Écran de test : développement seulement.
  if (!import.meta.env.DEV) throw new Error('écran de test interdit hors développement');
  if (import.meta.env.MODE === 'simule') {
    const { demarrerNavigateur } = await import('../../../packages/faux-serveur/src/navigateur.js');
    await demarrerNavigateur();
  }
  createRoot(document.getElementById('racine')!).render(<RouterProvider router={creerRouteur(ecransDecouverts())} />);
}
void demarrer();
