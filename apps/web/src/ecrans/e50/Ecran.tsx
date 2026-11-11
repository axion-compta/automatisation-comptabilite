import { e50 } from '../../../../../packages/textes/src/ecrans/e50.js';
import { FinDeContrat } from './FinDeContrat.js';

/** Écran E50 : une section par ligne (RGPD au lot 08). */
export const Ecran = () => <section aria-labelledby="e50-titre"><h1 id="e50-titre">{e50.titre}</h1><FinDeContrat /></section>;
