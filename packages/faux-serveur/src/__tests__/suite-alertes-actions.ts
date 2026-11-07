import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « alertes actions » : vide pour l’instant (jouée sur les deux cibles).
export const suiteAlertesActions = (nom: string, cible: Cible): void => (void cible, void describe('suite alertes actions commune : ' + nom, () => it.todo('suite alertes actions')));
