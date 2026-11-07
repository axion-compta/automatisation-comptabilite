import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

/** Suite commune du domaine « notifications » : vide pour l'instant (jouée sur les deux cibles). */
export function suiteNotifications(nom: string, cible: Cible): void {
  void cible;
  describe('suite notifications commune : ' + nom, () => {
    it.todo('suite notifications');
  });
}
