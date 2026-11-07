import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « alertes actions » : vide pour l’instant (jouée sur les deux cibles).
export const suiteAlertesActions = (nom: string, _cible: Cible): void => void describe('suite alertes actions commune : ' + nom, () => it.todo('suite alertes actions'));
