import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « exports » : vide pour l’instant (jouée sur les deux cibles).
export const suiteExports = (nom: string, cible: Cible): void => (void cible, void describe('suite exports commune : ' + nom, () => it.todo('suite exports')));
