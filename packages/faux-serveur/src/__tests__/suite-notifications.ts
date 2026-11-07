import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « notifications » : vide pour l’instant (jouée sur les deux cibles).
export const suiteNotifications = (nom: string, cible: Cible): void => (void cible, void describe('suite notifications commune : ' + nom, () => it.todo('suite notifications')));
