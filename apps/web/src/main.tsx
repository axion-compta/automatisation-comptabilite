import { createRoot } from 'react-dom/client';
import { Ecran } from './Ecran.js';

async function demarrer() {
  // Écran de test : développement seulement.
  if (!import.meta.env.DEV) throw new Error('écran de test interdit hors développement');
  if (import.meta.env.MODE === 'simule') {
    const { demarrerNavigateur } = await import('../../../packages/faux-serveur/src/navigateur.js');
    await demarrerNavigateur();
  }
  createRoot(document.getElementById('racine')!).render(<Ecran />);
}
void demarrer();
