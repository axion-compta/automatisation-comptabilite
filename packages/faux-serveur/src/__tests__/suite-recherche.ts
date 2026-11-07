import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « recherche » : vide pour l’instant (jouée sur les deux cibles).
export const suiteRecherche = (nom: string, cible: Cible): void => (void cible, void describe('suite recherche commune : ' + nom, () => it.todo('suite recherche')));
