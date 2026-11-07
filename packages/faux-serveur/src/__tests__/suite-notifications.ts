import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « notifications » : vide pour l’instant (jouée sur les deux cibles).
export const suiteNotifications = (nom: string, _cible: Cible): void => void describe('suite notifications commune : ' + nom, () => it.todo('suite notifications'));
