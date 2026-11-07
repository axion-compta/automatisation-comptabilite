import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « calendrier » : vide pour l’instant (jouée sur les deux cibles).
export const suiteCalendrier = (nom: string, cible: Cible): void => (void cible, void describe('suite calendrier commune : ' + nom, () => it.todo('suite calendrier')));
