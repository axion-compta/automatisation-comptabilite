import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « preferences » : vide pour l’instant (jouée sur les deux cibles).
export const suitePreferences = (nom: string, cible: Cible): void => (void cible, void describe('suite preferences commune : ' + nom, () => it.todo('suite preferences')));
