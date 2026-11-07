import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « preferences » : vide pour l’instant (jouée sur les deux cibles).
export const suitePreferences = (nom: string, _cible: Cible): void => void describe('suite preferences commune : ' + nom, () => it.todo('suite preferences'));
