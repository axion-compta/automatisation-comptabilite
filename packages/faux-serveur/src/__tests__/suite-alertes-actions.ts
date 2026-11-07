import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

/** Suite commune du domaine « alertes-actions » : vide pour l'instant (jouée sur les deux cibles). */
export function suiteAlertesActions(nom: string, cible: Cible): void {
  void cible;
  describe('suite alertes-actions commune : ' + nom, () => {
    it.todo('suite alertes-actions');
  });
}
