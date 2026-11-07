import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « exports » : vide pour l’instant (jouée sur les deux cibles).
export const suiteExports = (nom: string, _cible: Cible): void => void describe('suite exports commune : ' + nom, () => it.todo('suite exports'));
