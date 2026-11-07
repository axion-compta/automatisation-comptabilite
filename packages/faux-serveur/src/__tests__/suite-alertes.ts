import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « alertes » : vide pour l’instant (jouée sur les deux cibles).
export const suiteAlertes = (nom: string, cible: Cible): void => (void cible, void describe('suite alertes commune : ' + nom, () => it.todo('suite alertes')));
