import { createRoot } from 'react-dom/client';
import { Ecran } from './Ecran.js';

async function demarrer() {
  if (import.meta.env.MODE === 'simule') {
    const { demarrerNavigateur } = await import('../../../packages/faux-serveur/src/navigateur.js');
    await demarrerNavigateur();
  }
  createRoot(document.getElementById('racine')!).render(<Ecran />);
}
void demarrer();
