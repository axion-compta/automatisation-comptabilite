import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

// Suite commune « tableau de bord » : vide pour l’instant (jouée sur les deux cibles).
export const suiteTableauDeBord = (nom: string, _cible: Cible): void => void describe('suite tableau de bord commune : ' + nom, () => it.todo('suite tableau de bord'));
